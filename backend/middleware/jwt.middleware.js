const jwt = require('jsonwebtoken');
const { logger } = require('../../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'magnatas-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * Gera um JWT token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.discordId,
      username: user.username,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Gera um refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.discordId,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Middleware para verificar JWT
 */
function verifyJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.user.iat = decoded.iat;
    req.user.exp = decoded.exp;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    logger.error('Erro ao verificar JWT', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Middleware para refresh token
 */
function refreshAccessToken(req, res, next) {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token não fornecido' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Aqui você buscaria o usuário no banco de dados
    // Por enquanto, apenas regeneramos o token
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({ 
      success: true, 
      accessToken: newAccessToken 
    });
  } catch (error) {
    logger.error('Erro ao renovar token', error);
    return res.status(401).json({ error: 'Refresh token inválido' });
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyJWT,
  refreshAccessToken,
  JWT_SECRET,
  JWT_EXPIRY
};
