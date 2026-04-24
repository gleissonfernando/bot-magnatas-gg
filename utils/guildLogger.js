const GuildLog = require('../backend/models/GuildLog');
const { logger } = require('./logger');

/**
 * Registrar evento no log do servidor
 */
async function logGuildEvent(guildId, options) {
  try {
    const {
      type = 'info',
      title = 'Evento',
      description = '',
      userId = null,
      userName = null,
      userAvatar = null,
      channelId = null,
      channelName = null,
      messageId = null,
      metadata = {},
      severity = 'low',
      ipAddress = null,
      userAgent = null
    } = options;

    const logEntry = new GuildLog({
      guildId,
      type,
      title,
      description,
      userId,
      userName,
      userAvatar,
      channelId,
      channelName,
      messageId,
      metadata,
      severity,
      ipAddress,
      userAgent,
      createdAt: new Date()
    });

    await logEntry.save();
    logger.debug(`Log registrado para servidor ${guildId}: ${title}`);
    return logEntry;

  } catch (error) {
    logger.error(`Erro ao registrar log para servidor ${guildId}:`, error);
    throw error;
  }
}

/**
 * Buscar logs de um servidor com filtros
 */
async function getGuildLogs(guildId, options = {}) {
  try {
    const {
      type = null,
      userId = null,
      limit = 50,
      skip = 0,
      startDate = null,
      endDate = null
    } = options;

    const query = { guildId };

    if (type) query.type = type;
    if (userId) query.userId = userId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await GuildLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await GuildLog.countDocuments(query);

    return {
      logs,
      total,
      limit,
      skip,
      hasMore: skip + limit < total
    };

  } catch (error) {
    logger.error(`Erro ao buscar logs do servidor ${guildId}:`, error);
    throw error;
  }
}

/**
 * Limpar logs antigos de um servidor
 */
async function clearOldLogs(guildId, daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await GuildLog.deleteMany({
      guildId,
      createdAt: { $lt: cutoffDate }
    });

    logger.info(`${result.deletedCount} logs antigos removidos do servidor ${guildId}`);
    return result.deletedCount;

  } catch (error) {
    logger.error(`Erro ao limpar logs antigos do servidor ${guildId}:`, error);
    throw error;
  }
}

/**
 * Registrar evento de membro entrando
 */
async function logMemberJoin(guild, member) {
  return logGuildEvent(guild.id, {
    type: 'member_join',
    title: `${member.user.username} entrou no servidor`,
    description: `Novo membro: ${member.user.tag} (${member.id})`,
    userId: member.id,
    userName: member.user.username,
    userAvatar: member.user.displayAvatarURL({ dynamic: true }),
    metadata: {
      memberId: member.id,
      memberTag: member.user.tag,
      totalMembers: guild.memberCount
    },
    severity: 'low'
  });
}

/**
 * Registrar evento de membro saindo
 */
async function logMemberLeave(guild, member) {
  return logGuildEvent(guild.id, {
    type: 'member_leave',
    title: `${member.user.username} saiu do servidor`,
    description: `Membro removido: ${member.user.tag} (${member.id})`,
    userId: member.id,
    userName: member.user.username,
    userAvatar: member.user.displayAvatarURL({ dynamic: true }),
    metadata: {
      memberId: member.id,
      memberTag: member.user.tag,
      totalMembers: guild.memberCount
    },
    severity: 'low'
  });
}

/**
 * Registrar evento de configuração atualizada
 */
async function logConfigUpdate(guildId, guildName, updatedBy, changes) {
  return logGuildEvent(guildId, {
    type: 'config_updated',
    title: `Configurações atualizadas`,
    description: `Alterações realizadas por ${updatedBy}`,
    userId: updatedBy,
    metadata: {
      changes,
      guildName
    },
    severity: 'medium'
  });
}

/**
 * Registrar evento de manutenção
 */
async function logMaintenanceStatus(guildId, guildName, status, message) {
  return logGuildEvent(guildId, {
    type: status === 'started' ? 'maintenance_started' : 'maintenance_ended',
    title: `Manutenção ${status === 'started' ? 'iniciada' : 'finalizada'}`,
    description: message,
    metadata: {
      guildName,
      status
    },
    severity: 'high'
  });
}

/**
 * Registrar erro
 */
async function logError(guildId, errorTitle, errorMessage, metadata = {}) {
  return logGuildEvent(guildId, {
    type: 'error',
    title: errorTitle,
    description: errorMessage,
    metadata,
    severity: 'high'
  });
}

module.exports = {
  logGuildEvent,
  getGuildLogs,
  clearOldLogs,
  logMemberJoin,
  logMemberLeave,
  logConfigUpdate,
  logMaintenanceStatus,
  logError
};
