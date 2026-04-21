const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
        } catch (error) {
            await interaction.reply({ content: '❌ Não consegui banir esse usuário. Verifique minhas permissões!', ephemeral: true });
        }
    },
};
