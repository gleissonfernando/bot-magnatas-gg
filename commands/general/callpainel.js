const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('callpainel')
        .setDescription('Abre o painel de gerenciamento de calls temporárias')
        .setDefaultMemberPermissions(PermissionFlagsBits.Everyone),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔶 Gerenciamento das calls temporarias !')
            .setDescription('Aqui voce vera todas as formas de gerenciar sua call temporaria.')
            .setColor(0x2B2D31)
            .addFields(
                {
                    name: '🔹 Edicao',
                    value: '🔒 Deixar privada\n🔓 Deixar publica\n🔢 Alterar limite',
                    inline: false
                },
                {
                    name: '🔹 Gerenciamento',
                    value: '✅ Permitir alguem\n🚫 Desconectar alguem\n🔨 Banir alguem',
                    inline: false
                },
                {
                    name: '🔹 Gerenciamento Call',
                    value: '➕ Cria Call\n🗑️ Deletar call',
                    inline: false
                }
            )
            .setFooter({ text: 'Sistemas Magnatas.gg' });

        // Row 1: Edição
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call_private').setLabel('🔒 Privar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_public').setLabel('🔓 Publicar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_limit').setLabel('🔢 Limite').setStyle(ButtonStyle.Secondary),
        );

        // Row 2: Gerenciamento Usuários
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call_allow').setLabel('✅ Permitir').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_disconnect').setLabel('🚫 Desconectar').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_ban').setLabel('🔨 Banir').setStyle(ButtonStyle.Secondary),
        );

        // Row 3: Gerenciamento Canal
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call_create').setLabel('➕ Criar Call').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('call_delete').setLabel('🗑️ Deletar Call').setStyle(ButtonStyle.Danger),
        );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2, row3],
            ephemeral: true
        });
    },
};
