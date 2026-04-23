const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('painelverificar')
        .setDescription('Envia o painel de verificação profissional do magnatas.gg')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // --- Configurações de Design ---
        const BANNER_URL = config.bannerUrl || 'https://via.placeholder.com/1200x400?text=Magnatas.gg+Verification';
        
        // Alterado: Agora o link redireciona DIRETAMENTE para o site de verificação
        const DIRECT_URL = 'https://discord-verification.shardweb.app';

        // --- Construção do Embed ---
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Magnatas.gg - Sistema de Segurança', 
                iconURL: interaction.client.user.displayAvatarURL() 
            })
            .setTitle('🛡️ Central de Verificação')
            .setDescription(
                'Olá! Para garantir a segurança de nossa comunidade e liberar seu acesso, solicitamos que realize a verificação de sua conta.\n\n' +
                '**Por que verificar?**\n' +
                '> 💎 Acesso total aos canais exclusivos\n' +
                '> 🚀 Sincronização automática de cargos\n' +
                '> 🛡️ Proteção contra contas fakes\n\n' +
                'Clique no botão abaixo para iniciar o processo seguro.'
            )
            .setColor(0x5865F2) // Discord Blurple
            .addFields(
                {
                    name: '📌 Como funciona?',
                    value: '1. Clique em **Conectar com Discord**\n2. Você será levado ao nosso site oficial\n3. Siga as instruções na tela\n4. Aproveite o servidor!',
                    inline: true
                },
                {
                    name: '🛡️ Privacidade',
                    value: 'Seus dados são processados de forma criptografada e segura em nossos servidores.',
                    inline: true
                }
            )
            .setImage(BANNER_URL)
            .setFooter({
                text: '🔒 Verificação Instantânea & Segura',
            })
            .setTimestamp();

        // --- Construção do Botão ---
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Conectar com Discord')
                .setStyle(ButtonStyle.Link)
                .setURL(DIRECT_URL)
        );

        // --- Envio ---
        try {
            await interaction.reply({ content: '✅ Painel de verificação enviado com sucesso!', ephemeral: true });
            
            await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Erro ao enviar painel:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Ocorreu um erro ao tentar enviar o painel.', ephemeral: true }).catch(() => {});
            }
        }
    },
};
