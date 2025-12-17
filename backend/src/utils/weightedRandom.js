/**
 * Weighted random selection utility
 * Selects items based on their weight/score
 */

/**
 * Select n unique items from array based on weights
 * @param {Array<{item: any, weight: number}>} items - Items with weights
 * @param {number} count - Number of items to select
 * @returns {Array} Selected items
 */
export function weightedRandomSelection(items, count) {
  if (items.length <= count) {
    return items.map(i => i.item);
  }

  const selected = [];
  const remaining = [...items];

  for (let i = 0; i < count; i++) {
    // Normalize weights to positive values (add offset if needed)
    const minWeight = Math.min(...remaining.map(r => r.weight));
    const offset = minWeight < 0 ? Math.abs(minWeight) + 1 : 0;

    // Calculate total weight
    const totalWeight = remaining.reduce((sum, r) => sum + (r.weight + offset), 0);

    // Random value between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Select item based on cumulative weights
    let selectedIndex = -1;
    for (let j = 0; j < remaining.length; j++) {
      random -= (remaining[j].weight + offset);
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    // Fallback to last item if none selected
    if (selectedIndex === -1) {
      selectedIndex = remaining.length - 1;
    }

    // Add selected item and remove from remaining
    selected.push(remaining[selectedIndex].item);
    remaining.splice(selectedIndex, 1);
  }

  return selected;
}

/**
 * Generate weighted random numbers based on scores
 * @param {Array<{number: number, score: number}>} scores - Number scores
 * @param {number} count - How many numbers to generate (default 6)
 * @returns {Array<number>} Selected numbers (sorted)
 */
export function generateWeightedRandomNumbers(scores, count = 6) {
  const items = scores.map(s => ({
    item: s.number,
    weight: s.score
  }));

  const selected = weightedRandomSelection(items, count);
  return selected.sort((a, b) => a - b);
}
