const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  discordId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  username: String,
  avatar: String,
  email: String,
  
  // Sessão e Autenticação
  accessToken: String,
  refreshToken: String,
  tokenExpiresAt: Date,
  
  // Preferências
  selectedGuildId: String, // Último servidor selecionado
  language: { type: String, default: 'pt-BR' },
  theme: { type: String, default: 'dark' },
  
  // Permissões e Roles
  role: { type: String, enum: ['user', 'admin', 'developer'], default: 'user' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  lastSignedIn: Date,
  lastActivityAt: Date,
  
  // Segurança
  ipAddress: String,
  userAgent: String,
  isActive: { type: Boolean, default: true }
});

// Índices para performance
UserSchema.index({ discordId: 1 });
UserSchema.index({ lastActivityAt: 1 });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
