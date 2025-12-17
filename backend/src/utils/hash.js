import crypto from 'crypto';

/**
 * Generate SHA-256 hash from closure data
 * @param {object} closureData - The closure data object
 * @returns {string} SHA-256 hash in hexadecimal format
 */
export function generateClosureHash(closureData) {
  // Create deterministic string representation by sorting keys
  const dataString = JSON.stringify(closureData, Object.keys(closureData).sort());

  // Generate SHA-256 hash
  const hash = crypto
    .createHash('sha256')
    .update(dataString, 'utf8')
    .digest('hex');

  return hash;
}

/**
 * Verify that a closure hash matches the data
 * @param {object} closureData - The closure data object
 * @param {string} providedHash - The hash to verify
 * @returns {boolean} True if hash matches
 */
export function verifyClosureHash(closureData, providedHash) {
  const calculatedHash = generateClosureHash(closureData);
  return calculatedHash === providedHash;
}
