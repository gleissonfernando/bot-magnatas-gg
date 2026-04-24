const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logKick } = require('../../utils/guildLogger');
const { logger } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa um usuário do servidor')
        .addUserOption(option => option.setName('usuario').setDescription('O usuário a ser expulso').setRequired(true))
        .addStringOption(option => option.setName('motivo').setDescription('Motivo da expulsão'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo') || 'Não informado';

        try {
            const member = await interaction.guild.members.fetch(user.id);
            await member.kick(reason);
            await interaction.reply({ content: `👢 ${user.tag} foi expulso. Motivo: ${reason}` });

            // Registrar log de moderação no MongoDB e replicar para o painel
            try {
                await logKick(interaction.guildId, interaction.user, user, reason);
            } catch (logErr) {
                logger.error('Erro ao registrar log de kick:', logErr);
            }
        } catch (error) {
            logger.error('Erro ao executar comando kick:', error);
            await interaction.reply({ content: '❌ Não consegui expulsar esse usuário.', ephemeral: true });
        }
    },
};
