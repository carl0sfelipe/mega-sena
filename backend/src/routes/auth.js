import express from 'express';
import { supabase } from '../config/database.js';
import { validateName } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new user with name and PIX key
 */
router.post('/register', async (req, res) => {
  try {
    const { name, pixKey } = req.body;

    // Validate name
    const validation = validateName(name);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', ')
      });
    }

    const trimmedName = validation.trimmedName;

    // Validate PIX key
    if (!pixKey || pixKey.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Chave PIX inválida (mínimo 5 caracteres)'
      });
    }

    const trimmedPixKey = pixKey.trim();

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('name', trimmedName)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Usuário já existe. Use o login.'
      });
    }

    // Check if PIX key already used
    const { data: pixExists } = await supabase
      .from('users')
      .select('id')
      .eq('pix_key', trimmedPixKey)
      .single();

    if (pixExists) {
      return res.status(400).json({
        success: false,
        error: 'Esta chave PIX já está em uso'
      });
    }

    // Create user
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert([{
        name: trimmedName,
        pix_key: trimmedPixKey,
        is_admin: false
      }])
      .select()
      .single();

    if (createError) throw createError;

    console.log('✅ New user registered:', trimmedName);

    // Create session
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.isAdmin = user.is_admin;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar usuário'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with name and PIX key
 */
router.post('/login', async (req, res) => {
  try {
    const { name, pixKey } = req.body;

    // Validate name
    const validation = validateName(name);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', ')
      });
    }

    const trimmedName = validation.trimmedName;

    // Validate PIX key
    if (!pixKey || pixKey.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Chave PIX inválida'
      });
    }

    const trimmedPixKey = pixKey.trim();

    // Find user by name and PIX key
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('name', trimmedName)
      .eq('pix_key', trimmedPixKey)
      .single();

    if (findError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Nome ou chave PIX incorretos'
      });
    }

    console.log('✅ User logged in:', trimmedName);

    // Create session
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.isAdmin = user.is_admin;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fazer login'
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        error: 'Erro ao fazer logout'
      });
    }

    res.json({
      success: true
    });
  });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, is_admin, pix_key')
      .eq('id', req.session.userId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        isAdmin: user.is_admin,
        pixKey: user.pix_key
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do usuário'
    });
  }
});

export default router;
