const mongoose = require('mongoose');

const guildLogSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'member_join',
        'member_leave',
        'message_sent',
        'config_updated',
        'bot_status_changed',
        'maintenance_started',
        'maintenance_ended',
        'error',
        'warning',
        'info'
      ],
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    userId: {
      type: String,
      index: true
    },
    userName: String,
    userAvatar: String,
    channelId: String,
    channelName: String,
    messageId: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    ipAddress: String,
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 2592000 // Auto-delete após 30 dias
    }
  },
  { timestamps: true }
);

// Índice composto para buscas rápidas
guildLogSchema.index({ guildId: 1, createdAt: -1 });
guildLogSchema.index({ guildId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('GuildLog', guildLogSchema);
