// Application Configuration Constants

export const CONFIG = {
  // Bolão Information
  BOLAO_NAME: 'Bolão Mega da Virada 2026',
  DEFAULT_QUOTA: 10.00,

  // Payment Information
  PIX_KEY: '11999999999', // TODO: Replace with actual PIX key

  // Bet Levels (ordered by descending cost)
  BET_LEVELS: [
    { numbers: 9, cost: 504 },
    { numbers: 8, cost: 168 },
    { numbers: 7, cost: 42 },
    { numbers: 6, cost: 6 }
  ],

  // Mega-Sena Configuration
  MEGA_SENA_RANGE: {
    min: 1,
    max: 60
  },

  // Scoring Algorithm Weights
  SCORE_WEIGHTS: {
    historical: 40,      // Historical frequency component (0-40 points)
    popularity: 40,      // Current popularity component (0-40 points, inverted)
    antiPattern: 20      // Anti-pattern penalty (0-20 points)
  },

  // Anti-Pattern Penalties
  PENALTIES: {
    birthday: 10,        // Numbers 1-31 (birthday bias)
    multipleOf5: 5,      // Multiples of 5
    multipleOf10: 5      // Multiples of 10 (additional)
  },

  // Payment Statuses
  PAYMENT_STATUS: {
    PENDING: 'pending',
    CLAIMED: 'claimed',
    CONFIRMED: 'confirmed'
  },

  // Bolão Statuses
  BOLAO_STATUS: {
    OPEN: 'open',
    CLOSED: 'closed'
  }
};

// Helper Functions

/**
 * Get bet level based on total funds
 * @param {number} totalFunds - Total funds collected
 * @returns {object} Bet level information
 */
export function getBetLevelInfo(totalFunds) {
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
          surplus: surplusBets > 0 ? `${surplusBets} apostas de 6 números` : 'Nenhuma',
          remaining: `R$ ${remaining.toFixed(2)} não utilizado`
        }
      };
    }
  }

  return {
    betLevel: 0,
    error: 'Fundos insuficientes para aposta mínima (R$ 6,00)',
    totalFunds: totalFunds
  };
}
