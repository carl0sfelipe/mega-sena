import express from 'express';
import { supabase } from '../config/database.js';
import { CONFIG } from '../config/constants.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/payments/join
 * Join the current open bolão
 */
router.post('/join', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { quotaQuantity = 1 } = req.body;

    // Validate quota quantity
    if (!Number.isInteger(quotaQuantity) || quotaQuantity < 1 || quotaQuantity > 10) {
      return res.status(400).json({
        success: false,
        error: 'Quantidade de cotas inválida (mínimo 1, máximo 10)'
      });
    }

    // Get active bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('*')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão aberto encontrado'
      });
    }

    // Check if user already joined
    const { data: existing, error: existError } = await supabase
      .from('participations')
      .select('*')
      .eq('bolao_id', bolao.id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.json({
        success: true,
        alreadyJoined: true,
        participation: {
          id: existing.id,
          paymentStatus: existing.payment_status,
          quotaQuantity: existing.quota_quantity || 1
        },
        pixKey: CONFIG.PIX_KEY,
        quotaValue: parseFloat(bolao.quota_value),
        totalAmount: parseFloat(bolao.quota_value) * (existing.quota_quantity || 1)
      });
    }

    // Create participation
    const { data: participation, error: partError } = await supabase
      .from('participations')
      .insert([{
        bolao_id: bolao.id,
        user_id: userId,
        payment_status: CONFIG.PAYMENT_STATUS.PENDING,
        quota_quantity: quotaQuantity
      }])
      .select()
      .single();

    if (partError) throw partError;

    res.json({
      success: true,
      participation: {
        id: participation.id,
        paymentStatus: participation.payment_status,
        quotaQuantity: participation.quota_quantity
      },
      pixKey: CONFIG.PIX_KEY,
      quotaValue: parseFloat(bolao.quota_value),
      totalAmount: parseFloat(bolao.quota_value) * quotaQuantity
    });
  } catch (error) {
    console.error('Join bolão error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao entrar no bolão'
    });
  }
});

/**
 * POST /api/payments/claim-paid
 * User claims they have paid
 */
router.post('/claim-paid', requireAuth, async (req, res) => {
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

    // Update participation
    const { data: participation, error: updateError } = await supabase
      .from('participations')
      .update({
        payment_status: CONFIG.PAYMENT_STATUS.CLAIMED,
        payment_claimed_at: new Date().toISOString()
      })
      .eq('bolao_id', bolao.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      paymentStatus: participation.payment_status
    });
  } catch (error) {
    console.error('Claim paid error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar pagamento'
    });
  }
});

/**
 * GET /api/payments/status
 * Get current user's payment status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get active bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('*')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão aberto encontrado'
      });
    }

    // Get participation
    const { data: participation, error: partError } = await supabase
      .from('participations')
      .select('*')
      .eq('bolao_id', bolao.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (partError) throw partError;

    res.json({
      success: true,
      status: participation ? participation.payment_status : 'not_joined',
      quotaValue: parseFloat(bolao.quota_value),
      pixKey: CONFIG.PIX_KEY,
      participation: participation ? {
        id: participation.id,
        quotaQuantity: participation.quota_quantity || 1,
        totalAmount: parseFloat(bolao.quota_value) * (participation.quota_quantity || 1),
        claimedAt: participation.payment_claimed_at,
        confirmedAt: participation.payment_confirmed_at
      } : null
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar status do pagamento'
    });
  }
});

export default router;
