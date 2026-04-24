const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { logger } = require('../../utils/logger');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/messageUtils');

/**
 * Referência global ao cliente Discord
 */
let discordClient = null;

/**
 * Define a referência ao cliente Discord
 */
function setDiscordClient(client) {
    discordClient = client;
    logger.info('Discord Client registrado no Panel Controller para sincronização com Dashboard');
}

/**
 * Envia uma mensagem para um canal específico via Dashboard
 * POST /api/panel/send-message
 */
async function sendMessage(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            logger.warn('Tentativa de envio de mensagem via Dashboard com bot offline');
            return res.status(503).json({ 
                success: false, 
                error: 'Bot não está conectado ao Discord' 
            });
        }

        const { guildId, channelId, message, embeds } = req.body;

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
                error: 'Canal de texto não encontrado ou inválido' 
            });
        }

        const permissions = channel.permissionsFor(guild.members.me);
        if (!permissions.has(PermissionFlagsBits.SendMessages)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Bot não tem permissão para enviar mensagens neste canal' 
            });
        }

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

        const sentMessage = await channel.send({
            content: message || null,
            embeds: formattedEmbeds
        });

        logger.info(`Mensagem enviada via Dashboard`, { 
            guildId, 
            channelId, 
            messageId: sentMessage.id 
        });

        return res.json({
            success: true,
            messageId: sentMessage.id,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Erro no Panel Controller ao enviar mensagem', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Erro ao enviar mensagem'
        });
    }
}

/**
 * Obtém as configurações de um servidor
 */
async function getGuildSettings(req, res) {
    try {
        if (!discordClient || !discordClient.isReady()) {
            return res.status(503).json({ success: false, error: 'Bot offline' });
        }

        const { guildId } = req.params;
        const guild = discordClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ success: false, error: 'Servidor não encontrado' });
        }

        const GuildSettings = mongoose.models.GuildSettings;
        let settings = GuildSettings ? await GuildSettings.findOne({ guildId }) : null;

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
                channels: textChannels
            },
            settings: settings || { guildId, botEnabled: true }
        });
    } catch (error) {
        logger.error('Erro ao obter configurações via Dashboard', error, { guildId: req.params.guildId });
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Atualiza as configurações de um servidor
 */
async function updateGuildSettings(req, res) {
    try {
        const { guildId } = req.params;
        const updates = req.body;
        const GuildSettings = mongoose.models.GuildSettings;
        
        let settings = null;
        if (GuildSettings) {
            settings = await GuildSettings.findOneAndUpdate(
                { guildId },
                { ...updates, guildId, updatedAt: new Date() },
                { upsert: true, new: true }
            );
        }

        logger.info(`Configurações do servidor ${guildId} atualizadas via Dashboard`);

        return res.json({ success: true, settings });
    } catch (error) {
        logger.error('Erro ao atualizar configurações via Dashboard', error, { guildId: req.params.guildId });
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Teste de Boas-vindas usando novos utilitários
 */
async function testWelcomeMessage(req, res) {
    try {
        const { guildId, channelId, title, message, imageUrl } = req.body;
        const guild = discordClient.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(channelId);

        if (!channel) return res.status(404).json({ success: false, error: 'Canal não encontrado' });

        const embed = createSuccessEmbed(
            title || '👑 Bem-vindo(a) ao clã Magnatas',
            message || 'Seja bem-vindo ao império Magnatas.',
            {
                thumbnail: discordClient.user.displayAvatarURL(),
                footer: 'Magnatas.gg • Sincronizado com Dashboard',
                image: imageUrl
            }
        );

        const sentMessage = await channel.send({
            content: `👋 **Teste de Boas-vindas (Sincronizado)**`,
            embeds: [embed]
        });

        logger.info(`Teste de boas-vindas enviado via Dashboard para ${channelId}`);

        return res.json({ success: true, messageId: sentMessage.id });
    } catch (error) {
        logger.error('Erro no teste de boas-vindas via Dashboard', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Teste de Despedida usando novos utilitários
 */
async function testGoodbyeMessage(req, res) {
    try {
        const { guildId, channelId, title, message, imageUrl } = req.body;
        const guild = discordClient.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(channelId);

        if (!channel) return res.status(404).json({ success: false, error: 'Canal não encontrado' });

        const embed = createErrorEmbed(
            title || '🚪 Saída do clã Magnatas',
            message || 'Saiu do império Magnatas.',
            {
                thumbnail: discordClient.user.displayAvatarURL(),
                footer: 'Magnatas.gg • Sincronizado com Dashboard',
                image: imageUrl
            }
        );

        const sentMessage = await channel.send({
            content: `👋 **Teste de Despedida (Sincronizado)**`,
            embeds: [embed]
        });

        logger.info(`Teste de despedida enviado via Dashboard para ${channelId}`);

        return res.json({ success: true, messageId: sentMessage.id });
    } catch (error) {
        logger.error('Erro no teste de despedida via Dashboard', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

async function listGuilds(req, res) {
    try {
        if (!discordClient?.isReady()) return res.status(503).json({ success: false, error: 'Bot offline' });
        const guilds = discordClient.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL(),
            memberCount: guild.memberCount
        }));
        return res.json({ success: true, guilds });
    } catch (error) {
        logger.error('Erro ao listar servidores via Dashboard', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

async function healthCheck(req, res) {
    if (!discordClient?.isReady()) return res.status(503).json({ success: false, status: 'offline' });
    return res.json({ 
        success: true, 
        status: 'online',
        uptime: discordClient.uptime,
        ping: discordClient.ws.ping,
        guilds: discordClient.guilds.cache.size
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
