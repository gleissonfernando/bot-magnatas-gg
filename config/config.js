require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN,
    clientId: process.env.VITE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '1492325134550302952',
    guildId: process.env.VITE_DISCORD_GUILD_ID || process.env.DISCORD_GUILD_ID,
    roleId: process.env.DISCORD_VERIFIED_ROLE_ID || process.env.DISCORD_ROLE_ID,
    logChannelId: process.env.DISCORD_LOG_CHANNEL_ID,
    bannerUrl: process.env.DISCORD_BANNER_URL,
    welcomeChannelId: '1484488134602526833',
    goodbyeChannelId: '1484488134602526834',
    oauth2: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI || 'https://discord-verification.shardweb.app/'
    }
};
