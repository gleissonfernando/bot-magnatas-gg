const { logger } = require('../../utils/logger');
const GuildConfig = require('../models/GuildConfig');
const User = require('../models/User');

/**
 * Obter configurações de um servidor
 */
exports.getGuildConfig = async (req, res) => {
  try {
    const { guildId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // 1. Verificar se o usuário tem permissão (simplificado - em produção, validar com Discord API)
    const config = await GuildConfig.findOne({ guildId });

    if (!config) {
      // Retornar configuração padrão se não existir
      return res.json({ 
        success: true, 
        config: {
          guildId,
          guildName: 'Servidor',
          botEnabled: true,
          maintenanceEnabled: false,
          language: 'pt-BR',
          prefix: '!',
          timezone: 'America/Sao_Paulo'
        },
        isNew: true
      });
    }

    res.json({ success: true, config, isNew: false });

  } catch (error) {
    logger.error('Erro ao buscar configurações do servidor', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
};

/**
 * Salvar/atualizar configurações de um servidor
 */
exports.updateGuildConfig = async (req, res) => {
  try {
    const { guildId } = req.params;
    const userId = req.user?.userId;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!guildId) {
      return res.status(400).json({ error: 'guildId é obrigatório' });
    }

    // 1. Validar campos obrigatórios
    const allowedFields = [
      'guildName', 'guildIcon', 'ownerId',
      'logChannelId', 'welcomeChannelId', 'leaveChannelId', 'alertChannelId',
      'verifyRoleId',
      'language', 'prefix', 'timezone',
      'botEnabled', 'maintenanceEnabled', 'maintenanceMessage',
      'welcomeMessage', 'leaveMessage',
      'welcomeBanner', 'leaveBanner',
      'managerRoles', 'managerUsers'
    ];

    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    // 2. Adicionar metadados
    filteredUpdates.updatedBy = userId;
    filteredUpdates.updatedAt = new Date();

    // 3. Salvar/atualizar no banco
    const config = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: filteredUpdates },
      { upsert: true, new: true }
    );

    logger.info(`Configurações do servidor ${guildId} atualizadas por ${userId}`);

    res.json({ 
      success: true, 
      message: 'Configurações salvas com sucesso',
      config 
    });

  } catch (error) {
    logger.error('Erro ao atualizar configurações do servidor', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
};

/**
 * Resetar configurações de um servidor para padrão
 */
exports.resetGuildConfig = async (req, res) => {
  try {
    const { guildId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Deletar configurações
    await GuildConfig.deleteOne({ guildId });

    logger.info(`Configurações do servidor ${guildId} resetadas por ${userId}`);

    res.json({ 
      success: true, 
      message: 'Configurações resetadas para padrão'
    });

  } catch (error) {
    logger.error('Erro ao resetar configurações', error);
    res.status(500).json({ error: 'Erro ao resetar configurações' });
  }
};

/**
 * Sincronizar dados do servidor (membros, canais, cargos)
 */
exports.syncGuildData = async (req, res) => {
  try {
    const { guildId } = req.params;
    const userId = req.user?.userId;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!botToken) {
      return res.status(500).json({ error: 'Bot token não configurado' });
    }

    const axios = require('axios');
    const DISCORD_API = 'https://discord.com/api/v10';

    // 1. Buscar informações do servidor
    const guildResponse = await axios.get(
      `${DISCORD_API}/guilds/${guildId}?with_counts=true`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    const guildData = guildResponse.data;

    // 2. Buscar canais
    const channelsResponse = await axios.get(
      `${DISCORD_API}/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    // 3. Buscar cargos
    const rolesResponse = await axios.get(
      `${DISCORD_API}/guilds/${guildId}/roles`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    // 4. Atualizar configurações com dados sincronizados
    const config = await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          guildName: guildData.name,
          guildIcon: guildData.icon,
          ownerId: guildData.owner_id,
          memberCount: guildData.approximate_member_count,
          channelCount: channelsResponse.data.length,
          roleCount: rolesResponse.data.length,
          lastSync: new Date(),
          updatedBy: userId
        }
      },
      { upsert: true, new: true }
    );

    logger.info(`Dados do servidor ${guildId} sincronizados por ${userId}`);

    res.json({ 
      success: true, 
      message: 'Dados sincronizados com sucesso',
      config,
      stats: {
        members: guildData.approximate_member_count,
        channels: channelsResponse.data.length,
        roles: rolesResponse.data.length
      }
    });

  } catch (error) {
    logger.error('Erro ao sincronizar dados do servidor', error);
    res.status(500).json({ error: 'Erro ao sincronizar dados' });
  }
};
