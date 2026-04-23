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
        
        // Corrigido: Removido escopo 'bot' que causava erro de formulário inválido ao tentar usar link de autorização de bot em botão
        const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${config.oauth2.clientId}&redirect_uri=${encodeURIComponent(config.oauth2.redirectUri)}&response_type=code&scope=identify%20email`;

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
                'Clique no botão abaixo para iniciar o processo seguro via OAuth2.'
            )
            .setColor(0x5865F2) // Discord Blurple
            .addFields(
                {
                    name: '📌 Como funciona?',
                    value: '1. Clique em **Conectar com Discord**\n2. Autorize a aplicação oficial\n3. Aguarde alguns segundos\n4. Aproveite o servidor!',
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
                .setURL(OAUTH_URL)
        );

        // --- Envio ---
        try {
            // Usando reply direto para evitar problemas de sincronização se o canal for lento
            await interaction.reply({ content: '✅ Painel de verificação enviado com sucesso!', ephemeral: true });
            
            await interaction.channel.send({
                embeds: [embed],
                components: [row]
            });
        } catch (error) {
            console.error('Erro ao enviar painel:', error);
            // Fallback se o reply falhar
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Ocorreu um erro ao tentar enviar o painel.', ephemeral: true }).catch(() => {});
            }
        }
    },
};
