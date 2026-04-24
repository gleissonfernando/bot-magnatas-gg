const axios = require('axios');
const { logger } = require('../../utils/logger');
const User = require('../models/User');
const GuildConfig = require('../models/GuildConfig');

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Buscar servidores válidos do usuário (onde o bot está e o usuário tem permissão)
 */
exports.listValidGuilds = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // 1. Buscar usuário e seu token de acesso Discord
    const user = await User.findOne({ discordId: userId });

    if (!user || !user.accessToken) {
      return res.status(401).json({ error: 'Token de acesso não encontrado' });
    }

    // 2. Buscar servidores do usuário via OAuth2
    let userGuilds = [];
    try {
      const response = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${user.accessToken}` }
      });
      userGuilds = response.data;
      logger.info(`Buscados ${userGuilds.length} servidores para o usuário ${userId}`);
    } catch (error) {
      logger.error('Erro ao buscar servidores do usuário', error.response?.status);
      return res.status(401).json({ error: 'Erro ao buscar servidores do Discord' });
    }

    // 3. Filtrar servidores onde o usuário tem permissão
    const adminGuilds = userGuilds.filter(g => {
      const perms = parseInt(g.permissions);
      const isOwner = g.owner === true;
      const isAdmin = (perms & 0x8) === 0x8; // ADMINISTRATOR
      const canManage = (perms & 0x20) === 0x20; // MANAGE_GUILD
      return isOwner || isAdmin || canManage;
    });

    logger.info(`${adminGuilds.length} servidores com permissão para ${userId}`);

    // 4. Buscar configurações de cada servidor
    const validGuilds = await Promise.all(
      adminGuilds.map(async (guild) => {
        try {
          const config = await GuildConfig.findOne({ guildId: guild.id });
          
          return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            owner: guild.owner,
            permissions: guild.permissions,
            botPresent: !!config, // Se tem config, o bot está lá
            config: config ? {
              guildName: config.guildName,
              logChannelId: config.logChannelId,
              welcomeChannelId: config.welcomeChannelId,
              leaveChannelId: config.leaveChannelId,
              alertChannelId: config.alertChannelId,
              verifyRoleId: config.verifyRoleId,
              language: config.language,
              botEnabled: config.botEnabled,
              maintenanceEnabled: config.maintenanceEnabled,
              memberCount: config.memberCount,
              channelCount: config.channelCount,
              roleCount: config.roleCount,
              lastSync: config.lastSync,
              updatedAt: config.updatedAt
            } : null
          };
        } catch (error) {
          logger.error(`Erro ao buscar config do servidor ${guild.id}`, error);
          return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            owner: guild.owner,
            permissions: guild.permissions,
            botPresent: false,
            config: null
          };
        }
      })
    );

    // 5. Filtrar apenas servidores onde o bot está presente
    const botGuilds = validGuilds.filter(g => g.botPresent);

    if (botGuilds.length === 0) {
      logger.warn(`Nenhum servidor válido encontrado para ${userId}`);
    }

    res.json({ 
      success: true, 
      total: adminGuilds.length,
      withBot: botGuilds.length,
      guilds: botGuilds 
    });

  } catch (error) {
    logger.error('Erro ao listar servidores válidos', error);
    res.status(500).json({ error: 'Erro ao listar servidores' });
  }
};

/**
 * Buscar detalhes de um servidor específico
 */
exports.getGuildDetails = async (req, res) => {
  try {
    const { guildId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // 1. Verificar se o usuário tem permissão neste servidor
    const user = await User.findOne({ discordId: userId });
    
    if (!user || !user.accessToken) {
      return res.status(401).json({ error: 'Token não encontrado' });
    }

    // 2. Buscar servidores do usuário
    const response = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${user.accessToken}` }
    });

    const userGuild = response.data.find(g => g.id === guildId);

    if (!userGuild) {
      return res.status(403).json({ error: 'Você não faz parte deste servidor' });
    }

    // 3. Verificar permissões
    const perms = parseInt(userGuild.permissions);
    const isOwner = userGuild.owner === true;
    const isAdmin = (perms & 0x8) === 0x8;
    const canManage = (perms & 0x20) === 0x20;

    if (!isOwner && !isAdmin && !canManage) {
      return res.status(403).json({ error: 'Você não tem permissão para gerenciar este servidor' });
    }

    // 4. Buscar configurações do servidor
    const config = await GuildConfig.findOne({ guildId });

    if (!config) {
      return res.status(404).json({ error: 'Servidor não possui configurações' });
    }

    res.json({ 
      success: true, 
      guild: {
        id: guildId,
        name: config.guildName,
        icon: config.guildIcon,
        ownerId: config.ownerId,
        memberCount: config.memberCount,
        channelCount: config.channelCount,
        roleCount: config.roleCount
      },
      config 
    });

  } catch (error) {
    logger.error('Erro ao buscar detalhes do servidor', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes do servidor' });
  }
};

/**
 * Buscar canais de um servidor
 */
exports.getGuildChannels = async (req, res) => {
  try {
    const { guildId } = req.params;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: 'Bot token não configurado' });
    }

    const response = await axios.get(
      `${DISCORD_API}/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    const textChannels = response.data.filter(c => c.type === 0 || c.type === 5);

    res.json({ 
      success: true, 
      channels: textChannels.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        position: c.position
      }))
    });

  } catch (error) {
    logger.error('Erro ao buscar canais do servidor', error);
    res.status(500).json({ error: 'Erro ao buscar canais' });
  }
};

/**
 * Buscar cargos de um servidor
 */
exports.getGuildRoles = async (req, res) => {
  try {
    const { guildId } = req.params;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: 'Bot token não configurado' });
    }

    const response = await axios.get(
      `${DISCORD_API}/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    res.json({ 
      success: true, 
      roles: response.data
        .filter(r => !r.managed && r.id !== guildId) // Remover cargos gerenciados e @everyone
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.color,
          position: r.position
        }))
    });

  } catch (error) {
    logger.error('Erro ao buscar cargos do servidor', error);
    res.status(500).json({ error: 'Erro ao buscar cargos' });
  }
};
