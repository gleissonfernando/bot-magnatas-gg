const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('callpainel')
        .setDescription('Abre o painel de gerenciamento de calls temporárias')
        // Sem restrição de permissão — qualquer membro pode usar o painel de calls
    ,
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Magnatas.gg - Controle de Voz', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('🎙️ Painel de Gerenciamento de Call')
            .setDescription(
                'Bem-vindo ao seu centro de controle! Use os botões abaixo para personalizar sua experiência em nossa call temporária.\n\n' +
                '**Status Atual:** Gerenciável por você 👑'
            )
            .setColor(0x2ECC71) // Verde esmeralda para passar uma ideia de controle/ativo
            .addFields(
                {
                    name: '⚙️ Configurações de Acesso',
                    value: '`🔒 Privar` - Restringe a entrada\n`🔓 Publicar` - Abre para todos\n`🔢 Limite` - Define o máximo de membros',
                    inline: false
                },
                {
                    name: '👥 Controle de Membros',
                    value: '`✅ Permitir` - Autoriza um usuário\n`🚫 Retirar` - Remove da call\n`🔨 Banir` - Bloqueia permanentemente',
                    inline: false
                }
            )
            .setFooter({ text: 'Sistema de Calls Magnatas.gg • Gerencie com responsabilidade' })
            .setTimestamp();

        // Row 1: Acesso
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call_private').setLabel('Privar').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_public').setLabel('Publicar').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_limit').setLabel('Limite').setEmoji('🔢').setStyle(ButtonStyle.Secondary),
        );

        // Row 2: Membros
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call_allow').setLabel('Permitir').setEmoji('✅').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_disconnect').setLabel('Retirar').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('call_ban').setLabel('Banir').setEmoji('🔨').setStyle(ButtonStyle.Secondary),
        );

        // Row 3: Ações Globais
        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('call_create').setLabel('Criar Nova Call').setEmoji('➕').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('call_delete').setLabel('Encerrar Call').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
        );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2, row3],
            ephemeral: true
        });
    },
};
