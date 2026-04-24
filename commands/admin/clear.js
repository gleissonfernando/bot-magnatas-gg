const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logClear } = require('../../utils/guildLogger');
const { logger } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Limpa mensagens do chat')
        .addIntegerOption(option =>
            option.setName('quantidade')
                .setDescription('Número de mensagens para apagar')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        const amount = interaction.options.getInteger('quantidade');

        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: '❌ Por favor, escolha um valor entre 1 e 100.', ephemeral: true });
        }

        await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({ content: `🧹 ${amount} mensagens foram limpas com sucesso!`, ephemeral: true });

        // Registrar log de limpeza no MongoDB e replicar para o painel
        try {
            await logClear(
                interaction.guildId,
                interaction.user,
                interaction.channel.name,
                amount
            );
        } catch (logErr) {
            logger.error('Erro ao registrar log de clear:', logErr);
        }
    },
};
