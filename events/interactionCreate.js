/**
 * Evento de criação de interação — Magnatas.gg
 *
 * NOTA: O handler principal de interações (com suporte a manutenção, logs,
 * botões e modais) está registrado diretamente no index.js via client.on().
 * Este arquivo é mantido apenas para compatibilidade com o loader de eventos,
 * mas NÃO executa nenhuma lógica para evitar dupla execução.
 *
 * Toda a lógica de comandos, botões e modais está em index.js.
 */
const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Intencionalmente vazio — o handler completo está no index.js
        // para evitar dupla execução de comandos e conflito de respostas.
    },
};
