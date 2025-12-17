/**
 * Number Matrix Component
 * Renders the 60-number grid with scoring and selection
 */

class NumberMatrix {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedNumbers = [];
    this.scores = [];
    this.onSelectionChange = null; // Callback when selection changes
    this.maxSelections = 6; // Maximum numbers that can be selected
  }

  /**
   * Render the matrix with scores
   * @param {Array} scores - Array of score objects
   * @param {Array} selectedNumbers - Currently selected numbers
   */
  render(scores, selectedNumbers = []) {
    if (!this.container) return;

    this.scores = scores;
    this.selectedNumbers = selectedNumbers;
    this.container.innerHTML = '';

    for (let num = 1; num <= 60; num++) {
      const scoreData = scores.find(s => s.number === num);
      const button = this.createNumberButton(num, scoreData);
      this.container.appendChild(button);
    }
  }

  /**
   * Create a button for a single number
   * @param {number} num - Number (1-60)
   * @param {object} scoreData - Score data object
   * @returns {HTMLElement} Button element
   */
  createNumberButton(num, scoreData) {
    const button = document.createElement('button');
    button.className = 'number-btn';
    button.textContent = num;
    button.dataset.number = num;

    // Apply score-based coloring
    if (scoreData) {
      const score = scoreData.finalScore;

      if (score >= 80) {
        button.classList.add('score-high');
      } else if (score >= 50) {
        button.classList.add('score-medium');
      } else {
        button.classList.add('score-low');
      }

      // Tooltip with detailed scores
      button.title = this.generateTooltip(scoreData);
    }

    // Mark as selected if in selectedNumbers
    if (this.selectedNumbers.includes(num)) {
      button.classList.add('selected');
    }

    // Click handler
    button.addEventListener('click', () => this.toggleNumber(num));

    return button;
  }

  /**
   * Generate tooltip text for a number
   * @param {object} scoreData - Score data
   * @returns {string} Tooltip text
   */
  generateTooltip(scoreData) {
    return `Pontuação Total: ${scoreData.finalScore}

Componentes:
• Frequência Histórica: ${scoreData.historicalFrequency}/40
• Popularidade Atual: ${scoreData.currentPopularity}/40
• Penalidade Anti-Padrão: -${scoreData.antiPatternPenalty}

${scoreData.finalScore >= 80 ? '✅ Altamente recomendado' : scoreData.finalScore >= 50 ? '⚠️ Pontuação média' : '❌ Baixa pontuação'}`;
  }

  /**
   * Toggle number selection
   * @param {number} num - Number to toggle
   */
  toggleNumber(num) {
    const index = this.selectedNumbers.indexOf(num);

    if (index > -1) {
      // Deselect
      this.selectedNumbers.splice(index, 1);
    } else {
      // Check if max selections reached
      if (this.selectedNumbers.length >= this.maxSelections) {
        // Show warning
        const message = `Você já selecionou ${this.maxSelections} números (máximo permitido)`;
        if (window.showToast) {
          window.showToast(message, 'warning');
        } else {
          alert(message);
        }
        return; // Don't select
      }

      // Select
      this.selectedNumbers.push(num);
    }

    // Update button state
    const button = this.container.querySelector(`[data-number="${num}"]`);
    if (button) {
      button.classList.toggle('selected');
    }

    // Trigger callback
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedNumbers);
    }
  }

  /**
   * Get currently selected numbers
   * @returns {Array<number>} Selected numbers
   */
  getSelectedNumbers() {
    return [...this.selectedNumbers].sort((a, b) => a - b);
  }

  /**
   * Set selected numbers programmatically
   * @param {Array<number>} numbers - Numbers to select
   */
  setSelectedNumbers(numbers) {
    // Clear existing selections
    this.container.querySelectorAll('.number-btn.selected').forEach(btn => {
      btn.classList.remove('selected');
    });

    // Set new selections
    this.selectedNumbers = [...numbers];

    // Update button states
    numbers.forEach(num => {
      const button = this.container.querySelector(`[data-number="${num}"]`);
      if (button) {
        button.classList.add('selected');
      }
    });

    // Trigger callback
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedNumbers);
    }
  }

  /**
   * Clear all selections
   */
  clearSelections() {
    this.setSelectedNumbers([]);
  }

  /**
   * Disable/enable matrix interaction
   * @param {boolean} disabled - Whether to disable
   */
  setDisabled(disabled) {
    const buttons = this.container.querySelectorAll('.number-btn');
    buttons.forEach(btn => {
      btn.disabled = disabled;
    });
  }
}
