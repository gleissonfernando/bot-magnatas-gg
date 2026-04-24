const axios = require('axios');
const mongoose = require('mongoose');
const { logger } = require('../../utils/logger');
const { generateAccessToken, generateRefreshToken } = require('../middleware/jwt.middleware');

const User = require('../models/User');

/**
 * Inicia o fluxo de login OAuth2
 */
exports.login = (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || '1492325134550302952';
  const redirectUri = encodeURIComponent(
    process.env.DISCORD_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/callback`
  );
  
  const scopes = encodeURIComponent('identify email guilds');
  const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&prompt=consent`;
  
  logger.info('Iniciando fluxo de login OAuth2');
  res.redirect(oauthUrl);
};

/**
 * Callback do OAuth2 - Troca código por token
 */
exports.callback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    logger.warn('Callback OAuth2 sem código');
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    logger.info('Processando callback OAuth2');
    
    // 1. Trocar código por token de acesso
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '1492325134550302952',
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/callback`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;

    // 2. Buscar dados do usuário
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = userResponse.data;
    logger.info(`Usuário autenticado: ${userData.username} (${userData.id})`);

    // 3. Salvar/atualizar usuário no banco
    const user = await User.findOneAndUpdate(
      { discordId: userData.id },
      {
        discordId: userData.id,
        username: userData.username,
        avatar: userData.avatar,
        email: userData.email,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.data.expires_in * 1000),
        lastSignedIn: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      },
      { upsert: true, new: true }
    );

    // 4. Gerar JWT para a sessão local
    const jwtAccessToken = generateAccessToken(user);
    const jwtRefreshToken = generateRefreshToken(user);

    logger.info(`JWT gerado para ${userData.username}`);

    // 5. Redirecionar com tokens (seguro em produção)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/success?accessToken=${jwtAccessToken}&refreshToken=${jwtRefreshToken}&user=${userData.username}&avatar=${userData.avatar}`;
    
    res.redirect(redirectUrl);

  } catch (error) {
    logger.error('Erro no fluxo OAuth2', error.response?.data || error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error?message=Authentication failed`);
  }
};

/**
 * Renovar token de acesso usando refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token não fornecido' });
    }

    // Verificar refresh token no banco
    const user = await User.findOne({ refreshToken });

    if (!user) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }

    // Gerar novo access token
    const newAccessToken = generateAccessToken(user);

    res.json({ 
      success: true, 
      accessToken: newAccessToken 
    });
  } catch (error) {
    logger.error('Erro ao renovar token', error);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
};

/**
 * Logout do usuário
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (userId) {
      await User.findOneAndUpdate(
        { discordId: userId },
        { 
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null
        }
      );
      logger.info(`Usuário ${userId} fez logout`);
    }

    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    logger.error('Erro ao fazer logout', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};

/**
 * Obter dados do usuário autenticado
 */
exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await User.findOne({ discordId: userId }).select('-accessToken -refreshToken');

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ success: true, user });
  } catch (error) {
    logger.error('Erro ao buscar usuário', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

/**
 * Atualizar preferências do usuário
 */
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { selectedGuildId, language, theme } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const user = await User.findOneAndUpdate(
      { discordId: userId },
      { 
        selectedGuildId,
        language,
        theme,
        lastActivityAt: new Date()
      },
      { new: true }
    ).select('-accessToken -refreshToken');

    res.json({ success: true, user });
  } catch (error) {
    logger.error('Erro ao atualizar preferências', error);
    res.status(500).json({ error: 'Erro ao atualizar preferências' });
  }
};
