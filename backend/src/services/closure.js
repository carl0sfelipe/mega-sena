import { supabase } from '../config/database.js';
import { CONFIG } from '../config/constants.js';
import { getBolaoFinancials } from './betLevel.js';
import { generateClosureHash } from '../utils/hash.js';
import { getScores } from './scoring.js';
import { generateWeightedRandomNumbers } from '../utils/weightedRandom.js';

/**
 * Consolidate final numbers based on user votes and scores
 * @param {string} bolaoId - Bolão ID
 * @param {number} targetCount - How many numbers to select
 * @returns {Array<number>} Selected numbers (sorted)
 */
export async function consolidateFinalNumbers(bolaoId, targetCount) {
  try {
    // Get all selections from confirmed participants
    const { data: selections, error: selError } = await supabase
      .from('number_selections')
      .select(`
        number,
        participations!inner(payment_status)
      `)
      .eq('participations.bolao_id', bolaoId)
      .eq('participations.payment_status', CONFIG.PAYMENT_STATUS.CONFIRMED);

    if (selError) throw selError;

    // Count user votes for each number
    const userVotes = {};
    if (selections) {
      selections.forEach(sel => {
        userVotes[sel.number] = (userVotes[sel.number] || 0) + 1;
      });
    }

    // Get scores for tiebreaking
    const { data: scores, error: scoreError } = await supabase
      .from('number_scores')
      .select('number, final_score')
      .eq('bolao_id', bolaoId);

    if (scoreError) throw scoreError;

    const scoreMap = {};
    scores.forEach(s => {
      scoreMap[s.number] = s.final_score;
    });

    // Create ranked list
    const ranked = [];
    for (let num = 1; num <= 60; num++) {
      ranked.push({
        number: num,
        votes: userVotes[num] || 0,
        score: scoreMap[num] || 0
      });
    }

    // Sort: votes DESC, then score DESC
    ranked.sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes; // More votes first
      }
      return b.score - a.score; // Higher score first (tiebreaker)
    });

    // Take top N numbers
    const selected = ranked.slice(0, targetCount).map(r => r.number).sort((a, b) => a - b);

    return selected;
  } catch (error) {
    console.error('Error consolidating final numbers:', error);
    throw error;
  }
}

/**
 * Close the bolão and generate final bets with cryptographic hash
 * @param {string} bolaoId - Bolão ID
 * @param {string} adminUserId - Admin user ID performing the closure
 * @returns {object} Closure result with hash and final bets
 */
export async function closeBolao(bolaoId, adminUserId) {
  try {
    console.log('🔒 Closing bolão:', bolaoId);

    // 1. Verify bolão is open
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('*')
      .eq('id', bolaoId)
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      throw new Error('Bolão not found or already closed');
    }

    // 2. Get financial summary
    const financials = await getBolaoFinancials(bolaoId);

    if (financials.betLevel === 0) {
      throw new Error(financials.error || 'Insufficient funds');
    }

    console.log('💰 Total funds:', financials.totalFunds);
    console.log('🎯 Bet level:', financials.betLevel, 'numbers');
    console.log('💵 Bet cost:', financials.betCost);
    console.log('📦 Surplus bets:', financials.surplusBets);
    console.log('💸 Remaining funds:', financials.remainingFunds);

    // 3. Get all confirmed participants with their selections
    // Note: Using !participations_user_id_fkey to specify the user relationship
    const { data: participants, error: partError } = await supabase
      .from('participations')
      .select(`
        id,
        users!participations_user_id_fkey(id, name),
        number_selections(number)
      `)
      .eq('bolao_id', bolaoId)
      .eq('payment_status', CONFIG.PAYMENT_STATUS.CONFIRMED);

    if (partError) throw partError;

    // Auto-generate numbers for participants who didn't select
    const scores = await getScores(bolaoId, false);
    for (const participant of participants) {
      if (!participant.number_selections || participant.number_selections.length === 0) {
        console.log(`🎲 Auto-generating numbers for ${participant.users.name}`);

        // Generate weighted random numbers
        const generated = generateWeightedRandomNumbers(
          scores.map(s => ({ number: s.number, score: s.final_score })),
          6
        );

        // Insert generated selections
        const selections = generated.map(num => ({
          participation_id: participant.id,
          number: num
        }));

        const { error: insertError } = await supabase
          .from('number_selections')
          .insert(selections);

        if (insertError) {
          console.error(`Error auto-generating for ${participant.users.name}:`, insertError);
        } else {
          // Update the participant object with generated numbers
          participant.number_selections = selections.map(s => ({ number: s.number }));
        }
      }
    }

    // Transform participants data
    const participantsData = participants.map(p => ({
      userId: p.users.id,
      name: p.users.name,
      selectedNumbers: p.number_selections.map(ns => ns.number).sort((a, b) => a - b)
    }));

    // 4. Consolidate main bet numbers
    const mainBetNumbers = await consolidateFinalNumbers(bolaoId, financials.betLevel);

    console.log('🎲 Main bet numbers:', mainBetNumbers);

    // Get all number selections with user names for tooltips
    const { data: allSelections } = await supabase
      .from('number_selections')
      .select(`
        number,
        participations!inner(
          users!participations_user_id_fkey(name)
        )
      `)
      .eq('participations.bolao_id', bolaoId)
      .eq('participations.payment_status', CONFIG.PAYMENT_STATUS.CONFIRMED);

    // Build a map of number -> list of users who selected it
    const numberToUsers = {};
    if (allSelections) {
      allSelections.forEach(sel => {
        const num = sel.number;
        const userName = sel.participations.users.name;
        if (!numberToUsers[num]) {
          numberToUsers[num] = [];
        }
        numberToUsers[num].push(userName);
      });
    }

    // 5. Generate surplus bets if any
    const surplusBets = [];
    const usedNumbers = new Set(mainBetNumbers); // Track used numbers per bet cycle

    for (let i = 0; i < financials.surplusBets; i++) {
      console.log(`\n🎰 Generating surplus bet ${i + 1}...`);

      // Try to find unused numbers first
      let availableNumbers = [];
      for (let num = 1; num <= 60; num++) {
        if (!usedNumbers.has(num)) {
          availableNumbers.push(num);
        }
      }

      // If not enough unused numbers, reset and use all numbers
      if (availableNumbers.length < 6) {
        console.log(`   ⚠️  Only ${availableNumbers.length} unused numbers. Resetting pool to reuse numbers.`);
        usedNumbers.clear(); // Reset the used numbers
        availableNumbers = Array.from({ length: 60 }, (_, i) => i + 1); // All numbers 1-60
      }

      console.log(`   Available numbers: ${availableNumbers.length}`);

      // Get scores for available numbers
      const { data: scores, error: scoresError } = await supabase
        .from('number_scores')
        .select('number, final_score')
        .eq('bolao_id', bolaoId)
        .in('number', availableNumbers)
        .order('final_score', { ascending: false })
        .limit(6);

      if (scoresError) {
        console.error(`   Error fetching scores:`, scoresError);
        continue;
      }

      if (!scores || scores.length < 6) {
        console.error(`   Not enough scores found (need 6, got ${scores?.length || 0}).`);
        // Use weighted random generation as fallback
        const scoresData = await getScores(bolaoId, false);
        const generated = generateWeightedRandomNumbers(
          scoresData.map(s => ({ number: s.number, score: s.final_score })),
          6
        );
        surplusBets.push(generated);
        console.log(`   Surplus bet ${i + 1} numbers (fallback):`, generated);
        continue;
      }

      console.log(`   Got ${scores.length} scored numbers`);

      const surplusNumbers = scores.map(s => s.number).sort((a, b) => a - b);
      surplusBets.push(surplusNumbers);

      console.log(`   Surplus bet ${i + 1} numbers:`, surplusNumbers);

      // Mark these numbers as used for next iteration
      surplusNumbers.forEach(num => usedNumbers.add(num));
    }

    console.log(`\n✅ Generated ${surplusBets.length} surplus bets (requested ${financials.surplusBets})`);

    // 6. Create closure data
    const closureData = {
      bolaoId: bolaoId,
      bolaoName: bolao.name,
      closedAt: new Date().toISOString(),
      closedBy: adminUserId,
      totalFunds: financials.totalFunds,
      quotaValue: financials.quotaValue,
      participantCount: participantsData.length,
      participants: participantsData,
      numberToUsers: numberToUsers, // Map of number -> array of user names
      financials: {
        betLevel: financials.betLevel,
        betCost: financials.betCost,
        surplusBets: financials.surplusBets,
        remainingFunds: financials.remainingFunds
      },
      finalBets: [
        {
          type: `${financials.betLevel} números`,
          numbers: mainBetNumbers,
          cost: financials.betCost
        },
        ...surplusBets.map((nums, idx) => ({
          type: '6 números (surplus)',
          numbers: nums,
          cost: 6
        }))
      ]
    };

    // 7. Generate SHA-256 hash
    const hash = generateClosureHash(closureData);

    console.log('🔐 Generated hash:', hash);

    // 8. Update bolão status
    const { error: updateError } = await supabase
      .from('bolao')
      .update({
        status: CONFIG.BOLAO_STATUS.CLOSED,
        closure_hash: hash,
        closure_data: closureData,
        closed_at: closureData.closedAt
      })
      .eq('id', bolaoId);

    if (updateError) throw updateError;

    // 9. Insert final bets
    const betsToInsert = closureData.finalBets.map(bet => ({
      bolao_id: bolaoId,
      bet_type: bet.type,
      numbers: bet.numbers
    }));

    const { error: betsError } = await supabase
      .from('final_bets')
      .insert(betsToInsert);

    if (betsError) throw betsError;

    console.log('✅ Bolão closed successfully');

    return {
      success: true,
      hash,
      closureData,
      finalBets: closureData.finalBets
    };

  } catch (error) {
    console.error('Error closing bolão:', error);
    throw error;
  }
}

/**
 * Get closure information for a closed bolão
 * @param {string} bolaoId - Bolão ID
 * @returns {object} Closure information
 */
export async function getClosureInfo(bolaoId) {
  try {
    const { data: bolao, error } = await supabase
      .from('bolao')
      .select('status, closure_hash, closure_data, closed_at')
      .eq('id', bolaoId)
      .single();

    if (error) throw error;

    if (bolao.status !== CONFIG.BOLAO_STATUS.CLOSED) {
      throw new Error('Bolão is not closed');
    }

    return {
      status: bolao.status,
      hash: bolao.closure_hash,
      closedAt: bolao.closed_at,
      closureData: bolao.closure_data
    };
  } catch (error) {
    console.error('Error getting closure info:', error);
    throw error;
  }
}
