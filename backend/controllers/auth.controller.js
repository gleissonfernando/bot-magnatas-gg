const { generateToken } = require('../utils/jwt');
const axios = require('axios');
const mongoose = require('mongoose');

exports.login = (req, res) => {
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${(process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID)}&redirect_uri=${encodeURIComponent((process.env.DISCORD_REDIRECT_URI || process.env.REDIRECT_URI))}&response_type=code&scope=bot%20email%20gdm.join`;
    res.redirect(oauthUrl);
};

exports.callback = async (req, res) => {
    const { code } = req.query;

    if (!code) return res.status(400).send('No code provided');

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: (process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID),
            client_secret: (process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET),
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: (process.env.DISCORD_REDIRECT_URI || process.env.REDIRECT_URI),
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const userData = userResponse.data;

        await mongoose.connection.db.collection('verified_users').updateOne(
            { discordId: userData.id },
            { $set: { verified: true, username: userData.username, avatar: userData.avatar, lastVerified: new Date() } },
            { upsert: true }
        );

        // Generate JWT for the Primary API
        const token = generateToken({
            userId: userData.id,
            username: userData.username
        });

        // Redirect to frontend with the token in the query string
        // In a production app, we might use a secure cookie or a temporary code
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?token=${token}&user=${userData.username}&avatar=${userData.avatar}`);

    } catch (error) {
        console.error('OAuth2 Error:', error.response?.data || error.message);
        res.status(500).send('Authentication failed');
    }
};
