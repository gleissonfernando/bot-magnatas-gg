const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  guildName: String,
  guildIcon: String,
  ownerId: String,
  
  // Canais Configurados
  logChannelId: String,
  welcomeChannelId: String,
  leaveChannelId: String,
  alertChannelId: String,
  
  // Cargo de Verificação
  verifyRoleId: String,
  
  // Configurações Gerais
  language: { type: String, default: 'pt-BR' },
  prefix: { type: String, default: '!' },
  timezone: { type: String, default: 'America/Sao_Paulo' },
  
  // Status do Bot
  botEnabled: { type: Boolean, default: true },
  maintenanceEnabled: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: '⚠️ O bot está em manutenção.' },
  
  // Mensagens Personalizadas
  welcomeMessage: { type: String, default: '{user}, bem-vindo(a) ao servidor!' },
  leaveMessage: { type: String, default: '{user} saiu do servidor.' },
  
  // Banners/Imagens
  welcomeBanner: String,
  leaveBanner: String,
  
  // Permissões Customizáveis
  managerRoles: [String], // Cargos que podem gerenciar o bot
  managerUsers: [String], // Usuários que podem gerenciar o bot
  
  // Auditoria
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: String,
  
  // Estatísticas
  memberCount: Number,
  channelCount: Number,
  roleCount: Number,
  lastSync: Date
});

// Índices para performance
GuildConfigSchema.index({ guildId: 1 });
GuildConfigSchema.index({ ownerId: 1 });
GuildConfigSchema.index({ updatedAt: -1 });

// Middleware para atualizar updatedAt automaticamente
GuildConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.GuildConfig || mongoose.model('GuildConfig', GuildConfigSchema);
