import { supabase } from '../config/database.js';
import { CONFIG } from '../config/constants.js';
import { calculateAntiPatternPenalty } from './antiPattern.js';

/**
 * Calculate historical frequency scores for all numbers (1-60)
 * Based on how often each number appeared in historical draws
 * @returns {object} Map of number to historical score (0-40)
 */
export async function calculateHistoricalFrequency() {
  try {
    // Get all historical draws
    const { data: draws, error } = await supabase
      .from('historical_draws')
      .select('number_1, number_2, number_3, number_4, number_5, number_6');

    if (error) throw error;

    // Count occurrences of each number (1-60)
    const frequency = new Array(61).fill(0); // Index 0 unused, 1-60 for numbers

    draws.forEach(draw => {
      for (let i = 1; i <= 6; i++) {
        const num = draw[`number_${i}`];
        if (num >= 1 && num <= 60) {
          frequency[num]++;
        }
      }
    });

    // Find min and max for normalization
    const validFrequencies = frequency.slice(1); // Remove index 0
    const maxFreq = Math.max(...validFrequencies);
    const minFreq = Math.min(...validFrequencies);
    const range = maxFreq - minFreq;

    // Normalize to 0-40 scale
    const scores = {};
    for (let num = 1; num <= 60; num++) {
      if (range === 0) {
        // All numbers have same frequency (edge case)
        scores[num] = CONFIG.SCORE_WEIGHTS.historical / 2;
      } else {
        // Linear normalization: higher frequency = higher score
        const normalized = (frequency[num] - minFreq) / range;
        scores[num] = Math.round(normalized * CONFIG.SCORE_WEIGHTS.historical);
      }
    }

    return scores;
  } catch (error) {
    console.error('Error calculating historical frequency:', error);
    throw error;
  }
}

/**
 * Calculate current popularity scores for all numbers (1-60)
 * Based on how many confirmed users selected each number
 * INVERTED: Less popular = higher score
 * @param {string} bolaoId - Bolão ID
 * @returns {object} Map of number to popularity score (0-40)
 */
export async function calculatePopularity(bolaoId) {
  try {
    // Get all selections from confirmed participants
    const { data: selections, error } = await supabase
      .from('number_selections')
      .select(`
        number,
        participations!inner(bolao_id, payment_status)
      `)
      .eq('participations.bolao_id', bolaoId)
      .eq('participations.payment_status', CONFIG.PAYMENT_STATUS.CONFIRMED);

    if (error) throw error;

    // Count how many users picked each number
    const popularity = new Array(61).fill(0);

    if (selections && selections.length > 0) {
      selections.forEach(sel => {
        if (sel.number >= 1 && sel.number <= 60) {
          popularity[sel.number]++;
        }
      });
    }

    // Find max popularity
    const maxPop = Math.max(...popularity.slice(1), 1); // At least 1 to avoid division by zero

    // Normalize and invert: less popular = higher score
    const scores = {};
    for (let num = 1; num <= 60; num++) {
      // Inverted normalization
      const normalized = 1 - (popularity[num] / maxPop);
      scores[num] = Math.round(normalized * CONFIG.SCORE_WEIGHTS.popularity);
    }

    return scores;
  } catch (error) {
    console.error('Error calculating popularity:', error);
    throw error;
  }
}

/**
 * Calculate final scores for all numbers (1-60)
 * Formula: historical (0-40) + popularity (0-40) - anti_pattern_penalty (0-20)
 * @param {string} bolaoId - Bolão ID
 * @returns {Array<object>} Array of score objects for all 60 numbers
 */
export async function calculateAllScores(bolaoId) {
  try {
    console.log('📊 Calculating scores for bolão:', bolaoId);

    // Calculate components in parallel
    const [historicalScores, popularityScores] = await Promise.all([
      calculateHistoricalFrequency(),
      calculatePopularity(bolaoId)
    ]);

    const finalScores = [];

    for (let num = 1; num <= 60; num++) {
      const historical = historicalScores[num];
      const popularity = popularityScores[num];
      const penalty = calculateAntiPatternPenalty(num);

      const finalScore = historical + popularity - penalty;

      finalScores.push({
        bolao_id: bolaoId,
        number: num,
        historical_frequency: historical,
        current_popularity: popularity,
        anti_pattern_penalty: penalty,
        final_score: finalScore,
        last_updated: new Date().toISOString()
      });
    }

    // Upsert all scores to database
    const { error } = await supabase
      .from('number_scores')
      .upsert(finalScores, { onConflict: 'bolao_id,number' });

    if (error) throw error;

    console.log('✅ Scores calculated and saved successfully');

    return finalScores;
  } catch (error) {
    console.error('Error calculating all scores:', error);
    throw error;
  }
}

/**
 * Get current scores for a bolão
 * @param {string} bolaoId - Bolão ID
 * @param {boolean} recalculate - Whether to recalculate scores
 * @returns {Array<object>} Array of score objects
 */
export async function getScores(bolaoId, recalculate = false) {
  try {
    if (recalculate) {
      return await calculateAllScores(bolaoId);
    }

    // Try to get existing scores
    const { data: scores, error } = await supabase
      .from('number_scores')
      .select('*')
      .eq('bolao_id', bolaoId)
      .order('number', { ascending: true });

    if (error) throw error;

    // If no scores exist, calculate them
    if (!scores || scores.length === 0) {
      console.log('No scores found, calculating...');
      return await calculateAllScores(bolaoId);
    }

    return scores;
  } catch (error) {
    console.error('Error getting scores:', error);
    throw error;
  }
}

/**
 * Recalculate only popularity component (when user selections change)
 * More efficient than recalculating everything
 * @param {string} bolaoId - Bolão ID
 * @returns {Array<object>} Updated score objects
 */
export async function recalculatePopularity(bolaoId) {
  try {
    // Get existing scores
    const { data: existingScores, error: fetchError } = await supabase
      .from('number_scores')
      .select('*')
      .eq('bolao_id', bolaoId);

    if (fetchError) throw fetchError;

    // Calculate new popularity scores
    const newPopularityScores = await calculatePopularity(bolaoId);

    // Update scores
    const updatedScores = existingScores.map(score => {
      const newPopularity = newPopularityScores[score.number];
      const newFinalScore = score.historical_frequency + newPopularity - score.anti_pattern_penalty;

      return {
        ...score,
        current_popularity: newPopularity,
        final_score: newFinalScore,
        last_updated: new Date().toISOString()
      };
    });

    // Upsert updated scores
    const { error: updateError } = await supabase
      .from('number_scores')
      .upsert(updatedScores, { onConflict: 'bolao_id,number' });

    if (updateError) throw updateError;

    return updatedScores;
  } catch (error) {
    console.error('Error recalculating popularity:', error);
    throw error;
  }
}
