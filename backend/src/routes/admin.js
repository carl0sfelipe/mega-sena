import express from 'express';
import { supabase } from '../config/database.js';
import { CONFIG } from '../config/constants.js';
import { requireAdmin } from '../middleware/auth.js';
import { getBolaoFinancials } from '../services/betLevel.js';
import { closeBolao, getClosureInfo } from '../services/closure.js';
import { recalculatePopularity } from '../services/scoring.js';

const router = express.Router();

/**
 * GET /api/admin/participants
 * Get list of all participants with their details
 */
router.get('/participants', requireAdmin, async (req, res) => {
  try {
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

    // Get all participations with user info and selection count
    // Note: Using !participations_user_id_fkey to specify the user relationship
    const { data: participations, error: partError } = await supabase
      .from('participations')
      .select(`
        id,
        quota_quantity,
        payment_status,
        payment_claimed_at,
        payment_confirmed_at,
        created_at,
        users!participations_user_id_fkey(id, name),
        number_selections(number)
      `)
      .eq('bolao_id', bolao.id)
      .order('created_at', { ascending: true });

    if (partError) throw partError;

    // Get bolão quota value
    const { data: bolaoData } = await supabase
      .from('bolao')
      .select('quota_value')
      .eq('id', bolao.id)
      .single();

    const quotaValue = bolaoData ? parseFloat(bolaoData.quota_value) : 10;

    // Transform data
    const participants = participations.map(p => ({
      participationId: p.id,
      userId: p.users.id,
      name: p.users.name,
      quotaQuantity: p.quota_quantity || 1,
      totalAmount: (p.quota_quantity || 1) * quotaValue,
      paymentStatus: p.payment_status,
      claimedAt: p.payment_claimed_at,
      confirmedAt: p.payment_confirmed_at,
      joinedAt: p.created_at,
      selectedNumbersCount: p.number_selections ? p.number_selections.length : 0,
      selectedNumbers: p.number_selections ? p.number_selections.map(ns => ns.number).sort((a, b) => a - b) : []
    }));

    res.json({
      success: true,
      participants
    });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar participantes'
    });
  }
});

/**
 * POST /api/admin/confirm-payment
 * Confirm a user's payment
 */
router.post('/confirm-payment', requireAdmin, async (req, res) => {
  try {
    const { participationId } = req.body;
    const adminUserId = req.session.userId;

    if (!participationId) {
      return res.status(400).json({
        success: false,
        error: 'ID da participação é obrigatório'
      });
    }

    // Update participation
    const { data: participation, error: updateError } = await supabase
      .from('participations')
      .update({
        payment_status: CONFIG.PAYMENT_STATUS.CONFIRMED,
        payment_confirmed_at: new Date().toISOString(),
        confirmed_by: adminUserId
      })
      .eq('id', participationId)
      .select('bolao_id')
      .single();

    if (updateError) throw updateError;

    // Recalculate popularity scores (new confirmed user affects popularity)
    await recalculatePopularity(participation.bolao_id);

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao confirmar pagamento'
    });
  }
});

/**
 * GET /api/admin/totals
 * Get financial summary and bet level
 */
router.get('/totals', requireAdmin, async (req, res) => {
  try {
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

    // Get financials
    const financials = await getBolaoFinancials(bolao.id);

    res.json({
      success: true,
      quotaValue: financials.quotaValue,
      confirmedCount: financials.confirmedCount,
      totalFunds: financials.totalFunds,
      betLevel: financials.betLevel,
      betCost: financials.betCost,
      surplusBets: financials.surplusBets,
      remainingFunds: financials.remainingFunds,
      breakdown: financials.breakdown,
      error: financials.error || null
    });
  } catch (error) {
    console.error('Get totals error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar totais'
    });
  }
});

/**
 * POST /api/admin/close-bolao
 * Close the bolão and generate final bets
 */
router.post('/close-bolao', requireAdmin, async (req, res) => {
  try {
    const adminUserId = req.session.userId;

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

    // Close bolão
    const result = await closeBolao(bolao.id, adminUserId);

    res.json({
      success: true,
      hash: result.hash,
      closureData: result.closureData,
      finalBets: result.finalBets
    });
  } catch (error) {
    console.error('Close bolão error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao encerrar bolão'
    });
  }
});

export default router;
