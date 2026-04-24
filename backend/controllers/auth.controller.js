const { generateToken } = require('../utils/jwt');
const axios = require('axios');
const mongoose = require('mongoose');
const { logger } = require('../../utils/logger');

exports.login = (req, res) => {
    // Escopos expandidos para garantir que o bot tenha todas as permissões necessárias via OAuth2
    const scopes = ['identify', 'email', 'guilds', 'guilds.join'].join(' ');
    const redirectUri = process.env.DISCORD_REDIRECT_URI || process.env.REDIRECT_URI;
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${(process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
    
    logger.info('Iniciando fluxo de login OAuth2');
    res.redirect(oauthUrl);
};

exports.callback = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        logger.warn('Tentativa de callback OAuth2 sem código');
        return res.status(400).send('No code provided');
    }

    try {
        logger.info('Processando callback OAuth2');
        
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: (process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID),
            client_secret: (process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET),
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI || process.env.REDIRECT_URI,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = userResponse.data;
        logger.info(`Usuário autenticado via OAuth2: ${userData.username} (${userData.id})`);

        await mongoose.connection.db.collection('verified_users').updateOne(
            { discordId: userData.id },
            { $set: { verified: true, username: userData.username, avatar: userData.avatar, lastVerified: new Date() } },
            { upsert: true }
        );

        // Gera JWT para a API Principal
        const token = generateToken({
            userId: userData.id,
            username: userData.username
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        logger.info(`Redirecionando usuário para o frontend: ${userData.username}`);
        
        res.redirect(`${frontendUrl}/success?token=${token}&user=${userData.username}&avatar=${userData.avatar}`);

    } catch (error) {
        logger.error('Erro no fluxo OAuth2', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
};
