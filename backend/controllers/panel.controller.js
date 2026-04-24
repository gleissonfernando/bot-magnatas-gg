const { Client, ChannelType } = require('discord.js');

/**
 * Referência global ao cliente Discord
 * Será definida quando o bot iniciar
 */
let discordClient = null;

/**
 * Define a referência ao cliente Discord
 * Deve ser chamado no index.js após criar o cliente
 */
function setDiscordClient(client) {
    discordClient = client;
    console.log('[Panel Controller] Discord client registered');
}

/**
 * Envia uma mensagem para um canal específico
 * POST /api/panel/send-message
 */
async function sendMessage(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            return res.status(503).json({ 
                success: false, 
                error: 'Bot não está conectado ao Discord' 
            });
        }

        const { guildId, channelId, message, embeds } = req.body;

        // Validação
        if (!guildId || !channelId) {
            return res.status(400).json({ 
                success: false, 
                error: 'guildId e channelId são obrigatórios' 
            });
        }

        // Pelo menos um deve estar presente: message ou embeds
        if (!message && (!embeds || embeds.length === 0)) {
            return res.status(400).json({ 
                success: false, 
                error: 'É necessário fornecer uma mensagem ou pelo menos um embed' 
            });
        }

        // Verificar se o bot está no servidor
        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ 
                success: false, 
                error: 'Servidor não encontrado' 
            });
        }

        // Obter o canal
        const channel = guild.channels.cache.get(channelId);
        if (!channel) {
            return res.status(404).json({ 
                success: false, 
                error: 'Canal não encontrado' 
            });
        }

        // Verificar se o canal é um canal de texto
        if (channel.type !== ChannelType.GuildText) {
            return res.status(400).json({ 
                success: false, 
                error: 'Canal não é um canal de texto' 
            });
        }

        // Verificar permissões do bot
        if (!channel.permissionsFor(guild.members.me).has('SendMessages')) {
            return res.status(403).json({ 
                success: false, 
                error: 'Bot não tem permissão para enviar mensagens neste canal' 
            });
        }

        // Enviar mensagem real
        console.log(`[Bot] Tentando enviar mensagem real para o canal ${channelId} no servidor ${guildId}`);
        
        const sentMessage = await channel.send({
            content: message,
            embeds: embeds || []
        });

        console.log(`[Bot] Mensagem real enviada com sucesso! ID: ${sentMessage.id}`);

        return res.json({
            success: true,
            messageId: sentMessage.id,
            message: 'Mensagem enviada com sucesso',
            realData: true,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('[Panel Controller] Erro ao enviar mensagem:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao enviar mensagem'
        });
    }
}

/**
 * Obtém as configurações de um servidor
 * GET /api/panel/guild/:guildId
 */
async function getGuildSettings(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            return res.status(503).json({ 
                success: false, 
                error: 'Bot não está conectado ao Discord' 
            });
        }

        const { guildId } = req.params;

        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ 
                success: false, 
                error: 'Servidor não encontrado' 
            });
        }

        // Buscar configurações do banco de dados
        const mongoose = require('mongoose');
        const GuildSettings = mongoose.models.GuildSettings;
        
        let settings = null;
        if (GuildSettings) {
            settings = await GuildSettings.findOne({ guildId });
        }

        return res.json({
            success: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount,
                ownerId: guild.ownerId
            },
            settings: settings || {
                guildId,
                botEnabled: true,
                maintenanceMode: false,
                welcomeEnabled: false,
                goodbyeEnabled: false
            }
        });

    } catch (error) {
        console.error('[Panel Controller] Erro ao obter configurações:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao obter configurações'
        });
    }
}

/**
 * Atualiza as configurações de um servidor
 * PUT /api/panel/guild/:guildId
 */
async function updateGuildSettings(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            return res.status(503).json({ 
                success: false, 
                error: 'Bot não está conectado ao Discord' 
            });
        }

        const { guildId } = req.params;
        const updates = req.body;

        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ 
                success: false, 
                error: 'Servidor não encontrado' 
            });
        }

        // Atualizar no banco de dados
        const mongoose = require('mongoose');
        const GuildSettings = mongoose.models.GuildSettings;
        
        let settings = null;
        if (GuildSettings) {
            settings = await GuildSettings.findOneAndUpdate(
                { guildId },
                { ...updates, guildId },
                { upsert: true, new: true }
            );
        }

        return res.json({
            success: true,
            message: 'Configurações atualizadas com sucesso',
            settings
        });

    } catch (error) {
        console.error('[Panel Controller] Erro ao atualizar configurações:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao atualizar configurações'
        });
    }
}

/**
 * Envia uma mensagem de boas-vindas de teste
 * POST /api/panel/test-welcome
 */
async function testWelcomeMessage(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            return res.status(503).json({ 
                success: false, 
                error: 'Bot não está conectado ao Discord' 
            });
        }

        const { guildId, channelId } = req.body;

        if (!guildId || !channelId) {
            return res.status(400).json({ 
                success: false, 
                error: 'guildId e channelId são obrigatórios' 
            });
        }

        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ 
                success: false, 
                error: 'Servidor não encontrado' 
            });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return res.status(404).json({ 
                success: false, 
                error: 'Canal de texto não encontrado' 
            });
        }

        // Enviar mensagem de teste
        const testMessage = {
            content: '👋 **Bem-vindo ao servidor!**\n\nEsta é uma mensagem de teste de boas-vindas.',
            embeds: [{
                title: '🎉 Bem-vindo!',
                description: 'Você foi adicionado ao servidor com sucesso.',
                color: 0x00FF00,
                timestamp: new Date()
            }]
        };

        const sentMessage = await channel.send(testMessage);

        return res.json({
            success: true,
            messageId: sentMessage.id,
            message: 'Mensagem de teste enviada com sucesso'
        });

    } catch (error) {
        console.error('[Panel Controller] Erro ao enviar mensagem de teste:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao enviar mensagem de teste'
        });
    }
}

/**
 * Envia uma mensagem de despedida de teste
 * POST /api/panel/test-goodbye
 */
async function testGoodbyeMessage(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            return res.status(503).json({ 
                success: false, 
                error: 'Bot não está conectado ao Discord' 
            });
        }

        const { guildId, channelId } = req.body;

        if (!guildId || !channelId) {
            return res.status(400).json({ 
                success: false, 
                error: 'guildId e channelId são obrigatórios' 
            });
        }

        const guild = discordClient.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ 
                success: false, 
                error: 'Servidor não encontrado' 
            });
        }

        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            return res.status(404).json({ 
                success: false, 
                error: 'Canal de texto não encontrado' 
            });
        }

        // Enviar mensagem de teste
        const testMessage = {
            content: '👋 **Até logo!**\n\nEsta é uma mensagem de teste de despedida.',
            embeds: [{
                title: '😢 Adeus!',
                description: 'Um membro saiu do servidor.',
                color: 0xFF0000,
                timestamp: new Date()
            }]
        };

        const sentMessage = await channel.send(testMessage);

        return res.json({
            success: true,
            messageId: sentMessage.id,
            message: 'Mensagem de teste enviada com sucesso'
        });

    } catch (error) {
        console.error('[Panel Controller] Erro ao enviar mensagem de teste:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao enviar mensagem de teste'
        });
    }
}

/**
 * Lista todos os servidores onde o bot está presente
 * GET /api/panel/guilds
 */
async function listGuilds(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            return res.status(503).json({ 
                success: false, 
                error: 'Bot não está conectado ao Discord' 
            });
        }

        const guilds = discordClient.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount
        }));

        return res.json({
            success: true,
            guilds
        });

    } catch (error) {
        console.error('[Panel Controller] Erro ao listar servidores:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao listar servidores'
        });
    }
}

module.exports = {
    setDiscordClient,
    sendMessage,
    getGuildSettings,
    updateGuildSettings,
    testWelcomeMessage,
    testGoodbyeMessage,
    listGuilds
};
