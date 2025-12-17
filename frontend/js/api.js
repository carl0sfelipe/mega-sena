/**
 * API Client - Wrapper for all backend API calls
 */

const API_BASE_URL = window.APP_CONFIG?.API_URL || window.location.origin;

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
   * @param {object} options - Fetch options
   * @returns {Promise<object>} Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session management
    };

    const config = { ...defaultOptions, ...options };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
const response = await fetch(url, config);
const text = await response.text();

let data;
try {
  data = JSON.parse(text);
} catch (e) {
  console.error('Resposta não JSON:', text);
  throw new Error('Resposta inválida do servidor');
}

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
 * GET request
   */
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async register(name, pixKey) {
    return this.post('/api/auth/register', { name, pixKey });
  }

  async login(name, pixKey) {
    return this.post('/api/auth/login', { name, pixKey });
  }

  async logout() {
    return this.post('/api/auth/logout');
  }

  async getCurrentUser() {
    return this.get('/api/auth/me');
  }

  // Payment endpoints
  async joinBolao(quotaQuantity = 1) {
    return this.post('/api/payments/join', { quotaQuantity });
  }

  async claimPaid() {
    return this.post('/api/payments/claim-paid');
  }

  async getPaymentStatus() {
    return this.get('/api/payments/status');
  }

  // Number endpoints
  async getScores(recalculate = false) {
    const query = recalculate ? '?recalculate=true' : '';
    return this.get(`/api/numbers/scores${query}`);
  }

  async selectNumbers(numbers) {
    return this.post('/api/numbers/select', { numbers });
  }

  async getMySelections() {
    return this.get('/api/numbers/my-selections');
  }

  async generateNumbers() {
    return this.get('/api/numbers/generate');
  }

  // Admin endpoints
  async getParticipants() {
    return this.get('/api/admin/participants');
  }

  async confirmPayment(participationId) {
    return this.post('/api/admin/confirm-payment', { participationId });
  }

  async getTotals() {
    return this.get('/api/admin/totals');
  }

  async closeBolao() {
    return this.post('/api/admin/close-bolao');
  }

  // Bolao endpoints
  async getBolaoInfo() {
    return this.get('/api/bolao/info');
  }

  async getClosureInfo() {
    return this.get('/api/bolao/closure');
  }
}

// Create global API instance
const api = new APIClient();
