const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
        } catch (error) {
            await interaction.reply({ content: '❌ Não consegui expulsar esse usuário.', ephemeral: true });
        }
    },
};
