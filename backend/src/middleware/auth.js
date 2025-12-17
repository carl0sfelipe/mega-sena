/**
 * Authentication Middleware
 * Simple session-based authentication (name-only, no passwords)
 */

/**
 * Require user to be authenticated
 */
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Não autenticado. Por favor, faça login.'
    });
  }

  next();
}

/**
 * Require user to be an admin
 */
export function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: 'Não autenticado. Por favor, faça login.'
    });
  }

  if (!req.session.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado. Apenas administradores podem acessar este recurso.'
    });
  }

  next();
}

/**
 * Optional authentication - attaches user info if available, but doesn't require it
 */
export function optionalAuth(req, res, next) {
  // Just pass through, user info is available in req.session if logged in
  next();
}
