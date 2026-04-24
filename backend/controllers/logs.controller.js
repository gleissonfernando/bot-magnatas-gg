const { getGuildLogs, clearOldLogs } = require('../../utils/guildLogger');
const GuildLog = require('../models/GuildLog');
const { logger } = require('../../utils/logger');

/**
 * Buscar logs de um servidor
 * Acessível pelo painel via GET /api/panel/logs/:guildId
 * ou pela rota protegida GET /api/logs/:guildId
 */
exports.getLogs = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type, userId, limit = 50, skip = 0, startDate, endDate } = req.query;

    // Verificar permissões apenas se houver usuário autenticado (rota protegida)
    if (req.user) {
      const hasPermission = req.user.role === 'admin' ||
                           req.user.guilds?.includes(guildId) ||
                           req.user.id === req.guildConfig?.ownerId;
      if (!hasPermission) {
        logger.warn(`Acesso negado aos logs de ${guildId} por ${req.user.id}`);
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    // Buscar logs
    const logs = await getGuildLogs(guildId, {
      type: type || null,
      userId: userId || null,
      limit: Math.min(parseInt(limit), 100),
      skip: parseInt(skip),
      startDate,
      endDate
    });

    res.json(logs);

  } catch (error) {
    logger.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs' });
  }
};

/**
 * Limpar logs antigos
 */
exports.clearOldLogs = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { daysOld = 30 } = req.body;

    // Verificar permissões apenas se houver usuário autenticado
    if (req.user) {
      const isOwner = req.user.id === req.guildConfig?.ownerId;
      const isAdmin = req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        logger.warn(`Tentativa de limpar logs sem permissão por ${req.user.id}`);
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    const deletedCount = await clearOldLogs(guildId, daysOld);

    logger.info(`${deletedCount} logs antigos removidos do servidor ${guildId}`);
    res.json({ success: true, deletedCount });

  } catch (error) {
    logger.error('Erro ao limpar logs:', error);
    res.status(500).json({ error: 'Erro ao limpar logs' });
  }
};

/**
 * Exportar logs em CSV
 */
exports.exportLogs = async (req, res) => {
  try {
    const { guildId } = req.params;
    const { type, startDate, endDate } = req.query;

    // Verificar permissões apenas se houver usuário autenticado
    if (req.user) {
      const hasPermission = req.user.role === 'admin' ||
                           req.user.id === req.guildConfig?.ownerId;
      if (!hasPermission) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    // Buscar todos os logs (sem limite)
    const { logs } = await getGuildLogs(guildId, {
      type: type || null,
      limit: 10000,
      startDate,
      endDate
    });

    // Converter para CSV
    const csv = convertLogsToCSV(logs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="logs-${guildId}-${Date.now()}.csv"`);
    res.send(csv);

  } catch (error) {
    logger.error('Erro ao exportar logs:', error);
    res.status(500).json({ error: 'Erro ao exportar logs' });
  }
};

/**
 * Retornar estatísticas de logs por tipo
 * Acessível pelo painel via GET /api/panel/logs/:guildId/stats
 */
exports.getLogStats = async (req, res) => {
  try {
    const { guildId } = req.params;
    const GuildLogModel = GuildLog;

    const stats = await GuildLogModel.aggregate([
      { $match: { guildId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = stats.reduce((acc, s) => acc + s.count, 0);

    res.json({ guildId, total, byType: stats });
  } catch (error) {
    logger.error('Erro ao buscar estatísticas de logs:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas de logs' });
  }
};

/**
 * Converter logs para CSV
 */
function convertLogsToCSV(logs) {
  const headers = ['Data', 'Tipo', 'Título', 'Descrição', 'Usuário', 'Severidade'];
  const rows = logs.map(log => [
    new Date(log.createdAt).toLocaleString('pt-BR'),
    log.type,
    log.title,
    log.description || '',
    log.userName || 'N/A',
    log.severity
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}
