const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

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

        // Verificar se o canal é um canal de texto ou anúncios
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
            return res.status(400).json({ 
                success: false, 
                error: 'Canal não é um canal de texto ou anúncios' 
            });
        }

        // Verificar permissões do bot
        const permissions = channel.permissionsFor(guild.members.me);
        if (!permissions.has(PermissionFlagsBits.SendMessages)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Bot não tem permissão para enviar mensagens neste canal' 
            });
        }

        // Formatar embeds se fornecidos
        let formattedEmbeds = [];
        if (embeds && Array.isArray(embeds)) {
            formattedEmbeds = embeds.map(e => {
                const embed = new EmbedBuilder();
                if (e.title) embed.setTitle(e.title);
                if (e.description) embed.setDescription(e.description);
                if (e.color) embed.setColor(e.color);
                if (e.fields) embed.addFields(e.fields);
                if (e.image) embed.setImage(e.image.url || e.image);
                if (e.thumbnail) embed.setThumbnail(e.thumbnail.url || e.thumbnail);
                if (e.footer) embed.setFooter({ text: e.footer.text || e.footer, iconURL: e.footer.icon_url });
                if (e.timestamp) embed.setTimestamp(new Date(e.timestamp));
                return embed;
            });
        }

        // Enviar mensagem real
        console.log(`[Bot] Tentando enviar mensagem real para o canal ${channelId} no servidor ${guildId}`);
        
        const sentMessage = await channel.send({
            content: message || null,
            embeds: formattedEmbeds
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
        const GuildSettings = mongoose.models.GuildSettings;
        
        let settings = null;
        if (GuildSettings) {
            settings = await GuildSettings.findOne({ guildId });
        }

        // Obter dados reais do servidor
        const textChannels = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
            .map(c => ({ id: c.id, name: c.name }));

        return res.json({
            success: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount,
                ownerId: guild.ownerId,
                channels: textChannels,
                approximate_member_count: guild.memberCount
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
        const GuildSettings = mongoose.models.GuildSettings;
        
        let settings = null;
        if (GuildSettings) {
            settings = await GuildSettings.findOneAndUpdate(
                { guildId },
                { ...updates, guildId, updatedAt: new Date() },
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

        const { guildId, channelId, title, message, imageUrl } = req.body;

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
        if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Canal de texto não encontrado' 
            });
        }

        // Enviar mensagem de teste real
        const embed = new EmbedBuilder()
            .setTitle(title || '👑 Bem-vindo(a) ao clã Magnatas')
            .setDescription(message || 'seja bem-vindo ao império Magnatas.')
            .setColor(0xFF0000)
            .setThumbnail(discordClient.user.displayAvatarURL())
            .setFooter({ text: 'Magnatas.gg • Teste de Boas-vindas' })
            .setTimestamp();

        if (imageUrl) embed.setImage(imageUrl);

        const sentMessage = await channel.send({
            content: `👋 **Teste de Boas-vindas**`,
            embeds: [embed]
        });

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

        const { guildId, channelId, title, message, imageUrl } = req.body;

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
        if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Canal de texto não encontrado' 
            });
        }

        // Enviar mensagem de teste real
        const embed = new EmbedBuilder()
            .setTitle(title || '🚪 Saída do clã Magnatas')
            .setDescription(message || 'saiu do império Magnatas.')
            .setColor(0xFF0000)
            .setThumbnail(discordClient.user.displayAvatarURL())
            .setFooter({ text: 'Magnatas.gg • Teste de Despedida' })
            .setTimestamp();

        if (imageUrl) embed.setImage(imageUrl);

        const sentMessage = await channel.send({
            content: `👋 **Teste de Despedida**`,
            embeds: [embed]
        });

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

/**
 * Healthcheck para o monitoramento
 * GET /api/panel/guild/test
 */
async function healthCheck(req, res) {
    if (!discordClient || !discordClient.isReady()) {
        return res.status(503).json({ success: false, status: 'offline' });
    }
    return res.json({ 
        success: true, 
        status: 'online',
        uptime: discordClient.uptime,
        ping: discordClient.ws.ping,
        guilds: discordClient.guilds.cache.size,
        timestamp: new Date()
    });
}

module.exports = {
    setDiscordClient,
    sendMessage,
    getGuildSettings,
    updateGuildSettings,
    testWelcomeMessage,
    testGoodbyeMessage,
    listGuilds,
    healthCheck
};
