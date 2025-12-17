import { CONFIG } from '../config/constants.js';
import { supabase } from '../config/database.js';

/**
 * Calculate bet level based on total funds
 * @param {number} totalFunds - Total confirmed funds
 * @returns {object} Bet level information
 */
export function calculateBetLevel(totalFunds) {
  // Find highest bet level affordable
  for (const level of CONFIG.BET_LEVELS) {
    if (totalFunds >= level.cost) {
      const surplus = totalFunds - level.cost;
      const surplusBets = Math.floor(surplus / 6);
      const remaining = surplus % 6;

      return {
        betLevel: level.numbers,
        betCost: level.cost,
        surplusFunds: surplus,
        surplusBets: surplusBets,
        remainingFunds: remaining,
        totalFunds: totalFunds,
        breakdown: {
          mainBet: `1 aposta de ${level.numbers} números (R$ ${level.cost.toFixed(2)})`,
          surplus: surplusBets > 0 ? `${surplusBets} ${surplusBets === 1 ? 'aposta' : 'apostas'} de 6 números (R$ ${(surplusBets * 6).toFixed(2)})` : 'Nenhuma aposta adicional',
          remaining: `R$ ${remaining.toFixed(2)} não utilizado${remaining > 0 ? ' (insuficiente para aposta adicional)' : ''}`
        }
      };
    }
  }

  // If less than minimum bet
  return {
    betLevel: 0,
    error: 'Fundos insuficientes para aposta mínima (R$ 6,00)',
    totalFunds: totalFunds,
    breakdown: {
      message: `Arrecadado: R$ ${totalFunds.toFixed(2)}. Necessário: R$ 6,00 mínimo`
    }
  };
}

/**
 * Get total funds and bet level for current bolão
 * @param {string} bolaoId - Bolão ID
 * @returns {object} Financial summary
 */
export async function getBolaoFinancials(bolaoId) {
  try {
    // Get bolão info
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('quota_value, status')
      .eq('id', bolaoId)
      .single();

    if (bolaoError) throw bolaoError;

    // Get confirmed participations with quota quantities
    const { data: participations, error: partError } = await supabase
      .from('participations')
      .select('id, quota_quantity')
      .eq('bolao_id', bolaoId)
      .eq('payment_status', CONFIG.PAYMENT_STATUS.CONFIRMED);

    if (partError) throw partError;

    const confirmedCount = participations ? participations.length : 0;
    const totalQuotas = participations
      ? participations.reduce((sum, p) => sum + (p.quota_quantity || 1), 0)
      : 0;
    const quotaValue = parseFloat(bolao.quota_value);
    const totalFunds = totalQuotas * quotaValue;

    // Calculate bet level
    const betInfo = calculateBetLevel(totalFunds);

    return {
      quotaValue,
      confirmedCount,
      totalFunds,
      ...betInfo,
      status: bolao.status
    };
  } catch (error) {
    console.error('Error getting bolão financials:', error);
    throw error;
  }
}
