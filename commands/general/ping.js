const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde com a latência do bot'),
    async execute(interaction) {
        await interaction.reply(`🏓 Pong! Latência: \`${interaction.client.ws.ping}ms\``);
    },
};
