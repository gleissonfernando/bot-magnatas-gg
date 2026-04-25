require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN,
    clientId: process.env.VITE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.VITE_DISCORD_GUILD_ID || process.env.DISCORD_GUILD_ID,
    roleId: process.env.DISCORD_VERIFIED_ROLE_ID || process.env.DISCORD_ROLE_ID,
    logChannelId: process.env.DISCORD_LOG_CHANNEL_ID,
    bannerUrl: process.env.DISCORD_BANNER_URL,
    externalApiKey: process.env.EXTERNAL_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzY4MjYwMzEsInVzZXJfaWQiOiI1MGQyOTI1YS1hNzYzLTRlOTEtOTkyYS0zMWVkNjQ3NTdjOTYifQ.zX5DCLZkIGepiLUiNRrjL29KfdFWBY9_NX52I2NSdEs',
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID || '',
    goodbyeChannelId: process.env.GOODBYE_CHANNEL_ID || '',
    developerId: process.env.DEVELOPER_ID || '',
    oauth2: {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        redirectUri: process.env.DISCORD_REDIRECT_URI || 'https://discord-verification.shardweb.app/'
    }
};
