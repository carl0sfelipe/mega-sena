import express from 'express';
import { supabase } from '../config/database.js';
import { CONFIG } from '../config/constants.js';
import { requireAuth } from '../middleware/auth.js';
import { validateNumbers } from '../utils/validation.js';
import { getScores, recalculatePopularity } from '../services/scoring.js';
import { generateWeightedRandomNumbers } from '../utils/weightedRandom.js';

const router = express.Router();

/**
 * GET /api/numbers/scores
 * Get scores for all 60 numbers
 */
router.get('/scores', async (req, res) => {
  try {
    const recalculate = req.query.recalculate === 'true';

    // Get active bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('id')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão aberto encontrado'
      });
    }

    // Get scores
    const scores = await getScores(bolao.id, recalculate);

    res.json({
      success: true,
      scores: scores.map(s => ({
        number: s.number,
        historicalFrequency: s.historical_frequency,
        currentPopularity: s.current_popularity,
        antiPatternPenalty: s.anti_pattern_penalty,
        finalScore: s.final_score,
        lastUpdated: s.last_updated
      }))
    });
  } catch (error) {
    console.error('Get scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar pontuações'
    });
  }
});

/**
 * POST /api/numbers/select
 * Select numbers for the current user
 */
router.post('/select', requireAuth, async (req, res) => {
  try {
    const { numbers } = req.body;
    const userId = req.session.userId;

    // Validate numbers
    const validation = validateNumbers(numbers);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Get active bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('id')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão aberto encontrado'
      });
    }

    // Get user's participation
    const { data: participation, error: partError } = await supabase
      .from('participations')
      .select('id, payment_status')
      .eq('bolao_id', bolao.id)
      .eq('user_id', userId)
      .single();

    if (partError || !participation) {
      return res.status(404).json({
        success: false,
        error: 'Você não está participando deste bolão'
      });
    }

    // Only confirmed users can select numbers
    if (participation.payment_status !== CONFIG.PAYMENT_STATUS.CONFIRMED) {
      return res.status(403).json({
        success: false,
        error: 'Apenas participantes com pagamento confirmado podem selecionar números'
      });
    }

    // Delete existing selections
    await supabase
      .from('number_selections')
      .delete()
      .eq('participation_id', participation.id);

    // Insert new selections
    const selections = numbers.map(num => ({
      participation_id: participation.id,
      number: num
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('number_selections')
      .insert(selections)
      .select();

    if (insertError) throw insertError;

    // Recalculate popularity scores (since selections changed)
    await recalculatePopularity(bolao.id);

    res.json({
      success: true,
      selections: inserted.map(s => s.number).sort((a, b) => a - b)
    });
  } catch (error) {
    console.error('Select numbers error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao selecionar números'
    });
  }
});

/**
 * GET /api/numbers/my-selections
 * Get current user's selected numbers
 */
router.get('/my-selections', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get active bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('id')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão aberto encontrado'
      });
    }

    // Get user's participation
    const { data: participation, error: partError } = await supabase
      .from('participations')
      .select('id')
      .eq('bolao_id', bolao.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (partError) throw partError;

    if (!participation) {
      return res.json({
        success: true,
        numbers: []
      });
    }

    // Get selections
    const { data: selections, error: selError } = await supabase
      .from('number_selections')
      .select('number')
      .eq('participation_id', participation.id);

    if (selError) throw selError;

    const numbers = selections ? selections.map(s => s.number).sort((a, b) => a - b) : [];

    res.json({
      success: true,
      numbers
    });
  } catch (error) {
    console.error('Get selections error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar seleções'
    });
  }
});

/**
 * GET /api/numbers/generate
 * Generate random numbers based on weighted scores
 */
router.get('/generate', async (req, res) => {
  try {
    console.log('🎲 Generating random numbers...');

    // Get active bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('id')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      console.error('No open bolão found:', bolaoError);
      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão aberto encontrado'
      });
    }

    console.log('✅ Found bolão:', bolao.id);

    // Get scores
    const scores = await getScores(bolao.id, false);
    console.log(`📊 Got ${scores.length} scores`);

    // Generate weighted random numbers
    const generated = generateWeightedRandomNumbers(
      scores.map(s => ({ number: s.number, score: s.final_score })),
      6
    );

    console.log('✅ Generated numbers:', generated);

    res.json({
      success: true,
      numbers: generated
    });
  } catch (error) {
    console.error('Generate numbers error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao gerar números'
    });
  }
});

export default router;
