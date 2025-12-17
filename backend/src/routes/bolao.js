import express from 'express';
import { supabase } from '../config/database.js';
import { CONFIG } from '../config/constants.js';
import { getClosureInfo } from '../services/closure.js';

const router = express.Router();

/**
 * GET /api/bolao/info
 * Get current bolão information
 */
router.get('/info', async (req, res) => {
  try {
    // Get active bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('*')
      .eq('status', CONFIG.BOLAO_STATUS.OPEN)
      .single();

    if (bolaoError || !bolao) {
      // Check if there's a closed bolão
      const { data: closedBolao, error: closedError } = await supabase
        .from('bolao')
        .select('*')
        .eq('status', CONFIG.BOLAO_STATUS.CLOSED)
        .order('closed_at', { ascending: false })
        .limit(1)
        .single();

      if (closedBolao) {
        return res.json({
          success: true,
          status: 'closed',
          bolao: {
            id: closedBolao.id,
            name: closedBolao.name,
            status: closedBolao.status,
            closedAt: closedBolao.closed_at
          }
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão encontrado'
      });
    }

    // Count participations
    const { data: allParticipants, error: allError } = await supabase
      .from('participations')
      .select('id, payment_status')
      .eq('bolao_id', bolao.id);

    if (allError) throw allError;

    const totalParticipants = allParticipants ? allParticipants.length : 0;
    const confirmedParticipants = allParticipants
      ? allParticipants.filter(p => p.payment_status === CONFIG.PAYMENT_STATUS.CONFIRMED).length
      : 0;

    res.json({
      success: true,
      bolao: {
        id: bolao.id,
        name: bolao.name,
        quotaValue: parseFloat(bolao.quota_value),
        status: bolao.status,
        participantCount: totalParticipants,
        confirmedCount: confirmedParticipants,
        createdAt: bolao.created_at
      }
    });
  } catch (error) {
    console.error('Get bolão info error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar informações do bolão'
    });
  }
});

/**
 * GET /api/bolao/closure
 * Get closure information (only if closed)
 */
router.get('/closure', async (req, res) => {
  try {
    // Try to get latest closed bolão
    const { data: bolao, error: bolaoError } = await supabase
      .from('bolao')
      .select('id')
      .eq('status', CONFIG.BOLAO_STATUS.CLOSED)
      .order('closed_at', { ascending: false })
      .limit(1)
      .single();

    if (bolaoError || !bolao) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum bolão encerrado encontrado'
      });
    }

    // Get closure info
    const closureInfo = await getClosureInfo(bolao.id);

    res.json({
      success: true,
      ...closureInfo
    });
  } catch (error) {
    console.error('Get closure info error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao buscar informações de encerramento'
    });
  }
});

export default router;
