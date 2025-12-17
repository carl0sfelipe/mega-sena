import { CONFIG } from '../config/constants.js';

/**
 * Calculate anti-pattern penalty for a single number
 * @param {number} number - Number to analyze (1-60)
 * @returns {number} Penalty points (0-20)
 */
export function calculateAntiPatternPenalty(number) {
  let penalty = 0;

  // 1. Birthday bias (numbers 1-31): -10 points
  if (number >= 1 && number <= 31) {
    penalty += CONFIG.PENALTIES.birthday;
  }

  // 2. Multiples of 5: -5 points
  if (number % 5 === 0) {
    penalty += CONFIG.PENALTIES.multipleOf5;
  }

  // 3. Multiples of 10: additional -5 points
  if (number % 10 === 0) {
    penalty += CONFIG.PENALTIES.multipleOf10;
  }

  // Cap at maximum penalty
  return Math.min(penalty, CONFIG.SCORE_WEIGHTS.antiPattern);
}

/**
 * Detect common anti-patterns in a set of numbers
 * @param {Array<number>} numbers - Array of numbers to analyze
 * @returns {Array<object>} Array of detected patterns with severity
 */
export function detectAntiPatterns(numbers) {
  if (!numbers || numbers.length === 0) {
    return [];
  }

  const patterns = [];

  // 1. All numbers <= 31 (birthday bias)
  const birthdayBiasCount = numbers.filter(n => n <= 31).length;
  if (birthdayBiasCount === numbers.length) {
    patterns.push({
      type: 'birthday_bias',
      severity: 'high',
      message: 'Todos os números são ≤ 31 (viés de aniversário)',
      count: birthdayBiasCount
    });
  } else if (birthdayBiasCount / numbers.length > 0.7) {
    patterns.push({
      type: 'birthday_bias_partial',
      severity: 'medium',
      message: `${birthdayBiasCount} de ${numbers.length} números são ≤ 31`,
      count: birthdayBiasCount
    });
  }

  // 2. Sequential numbers (e.g., 1,2,3,4,5,6 or 5,6,7,8)
  const sorted = [...numbers].sort((a, b) => a - b);
  let maxSequence = 1;
  let currentSequence = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      currentSequence++;
      maxSequence = Math.max(maxSequence, currentSequence);
    } else {
      currentSequence = 1;
    }
  }

  if (maxSequence >= 4) {
    patterns.push({
      type: 'sequential',
      severity: maxSequence >= 5 ? 'high' : 'medium',
      message: `Sequência de ${maxSequence} números consecutivos`,
      count: maxSequence
    });
  }

  // 3. All even or all odd
  const evenCount = numbers.filter(n => n % 2 === 0).length;
  const oddCount = numbers.length - evenCount;

  if (evenCount === 0) {
    patterns.push({
      type: 'all_odd',
      severity: 'low',
      message: 'Todos os números são ímpares',
      count: oddCount
    });
  } else if (oddCount === 0) {
    patterns.push({
      type: 'all_even',
      severity: 'low',
      message: 'Todos os números são pares',
      count: evenCount
    });
  }

  // 4. Too many multiples of 5
  const multOf5 = numbers.filter(n => n % 5 === 0).length;
  if (multOf5 / numbers.length >= 0.5) {
    patterns.push({
      type: 'multiples_of_5',
      severity: 'medium',
      message: `${multOf5} de ${numbers.length} números são múltiplos de 5`,
      count: multOf5
    });
  }

  // 5. Too many multiples of 10
  const multOf10 = numbers.filter(n => n % 10 === 0).length;
  if (multOf10 >= 3) {
    patterns.push({
      type: 'multiples_of_10',
      severity: 'high',
      message: `${multOf10} números são múltiplos de 10`,
      count: multOf10
    });
  }

  // 6. All numbers in same decade
  const decades = new Set(numbers.map(n => Math.floor(n / 10)));
  if (decades.size === 1) {
    patterns.push({
      type: 'same_decade',
      severity: 'high',
      message: 'Todos os números estão na mesma dezena',
      count: 1
    });
  }

  return patterns;
}

/**
 * Calculate overall pattern score (how "human-like" the selection is)
 * @param {Array<number>} numbers - Array of numbers to analyze
 * @returns {number} Pattern score (0-100, higher = more pattern-like/bad)
 */
export function calculatePatternScore(numbers) {
  const patterns = detectAntiPatterns(numbers);

  let score = 0;

  patterns.forEach(pattern => {
    switch (pattern.severity) {
      case 'high':
        score += 30;
        break;
      case 'medium':
        score += 15;
        break;
      case 'low':
        score += 5;
        break;
    }
  });

  return Math.min(score, 100);
}
