const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logBan } = require('../../utils/guildLogger');
const { logger } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bane um usuário do servidor')
        .addUserOption(option => option.setName('usuario').setDescription('O usuário a ser banido').setRequired(true))
        .addStringOption(option => option.setName('motivo').setDescription('Motivo do banimento'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Não informado';

        try {
            await interaction.guild.members.ban(user, { reason });
            await interaction.reply({ content: `🔨 ${user.tag} foi banido. Motivo: ${reason}` });

            // Registrar log de moderação no MongoDB e replicar para o painel
            try {
                await logBan(interaction.guildId, interaction.user, user, reason);
            } catch (logErr) {
                logger.error('Erro ao registrar log de ban:', logErr);
            }
        } catch (error) {
            logger.error('Erro ao executar comando ban:', error);
            await interaction.reply({ content: '❌ Não consegui banir esse usuário. Verifique minhas permissões!', ephemeral: true });
        }
    },
};
