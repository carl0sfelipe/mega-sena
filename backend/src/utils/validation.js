import { CONFIG } from '../config/constants.js';

/**
 * Validate that a number is within valid Mega-Sena range (1-60)
 * @param {number} number - Number to validate
 * @returns {boolean} True if valid
 */
export function isValidNumber(number) {
  return Number.isInteger(number) &&
         number >= CONFIG.MEGA_SENA_RANGE.min &&
         number <= CONFIG.MEGA_SENA_RANGE.max;
}

/**
 * Validate an array of numbers
 * @param {Array<number>} numbers - Array of numbers to validate
 * @returns {object} { valid: boolean, errors: Array<string> }
 */
export function validateNumbers(numbers) {
  const errors = [];

  if (!Array.isArray(numbers)) {
    errors.push('Numbers must be an array');
    return { valid: false, errors };
  }

  if (numbers.length === 0) {
    errors.push('At least one number is required');
    return { valid: false, errors };
  }

  // Check for duplicates
  const uniqueNumbers = new Set(numbers);
  if (uniqueNumbers.size !== numbers.length) {
    errors.push('Duplicate numbers are not allowed');
  }

  // Validate each number
  for (const num of numbers) {
    if (!isValidNumber(num)) {
      errors.push(`Invalid number: ${num} (must be between 1 and 60)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user name
 * @param {string} name - User name to validate
 * @returns {object} { valid: boolean, errors: Array<string> }
 */
export function validateName(name) {
  const errors = [];

  if (typeof name !== 'string') {
    errors.push('Name must be a string');
    return { valid: false, errors };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    errors.push('Name cannot be empty');
  }

  if (trimmedName.length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (trimmedName.length > 50) {
    errors.push('Name must be less than 50 characters');
  }

  // Only allow letters, spaces, and basic accented characters
  const validNameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
  if (!validNameRegex.test(trimmedName)) {
    errors.push('Name can only contain letters and spaces');
  }

  return {
    valid: errors.length === 0,
    errors,
    trimmedName
  };
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}
