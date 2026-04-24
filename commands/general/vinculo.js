const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const { logger } = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vinculo')
        .setDescription('Vincula seu ID do Discord ao sistema de sincronização (Apenas DEVS)')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('O usuário que você deseja vincular (deixe vazio para você mesmo)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),
    async execute(interaction) {
        // 1. Verificação de Permissão via API do Bot (Banco de Dados)
        try {
            // Usamos a porta 3000 por padrão do backend ou env
            const PORT = process.env.PORT || 3000;
            const API_BASE = process.env.INTERNAL_API_URL || `http://127.0.0.1:${PORT}`;
            const response = await axios.get(`${API_BASE}/api/panel/verify-dev/${interaction.user.id}`);
            
            if (!response.data.success || !response.data.hasPermission) {
                return interaction.reply({ 
                    content: '❌ **Acesso Negado!** Este comando é exclusivo para usuários com cargo de **Desenvolvedor** registrado na Dashboard Magnatas.', 
                    ephemeral: true 
                });
            }
        } catch (error) {
            logger.error('Erro ao verificar permissão de dev no comando /vinculo:', error.message);
            // Se a API falhar, permitimos apenas o Master ID hardcoded como fallback de segurança
            const MASTER_ID = process.env.DEVELOPER_ID || '761011766440230932';
            if (interaction.user.id !== MASTER_ID) {
                return interaction.reply({ 
                    content: '⚠️ **Erro de Sistema:** Não foi possível verificar suas permissões de desenvolvedor. Tente novamente mais tarde.', 
                    ephemeral: true 
                });
            }
        }

        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000') // Vermelho Magnatas
            .setTitle('🔗 Sincronização de Vínculo')
            .setDescription(`O ID do Discord para **${targetUser.tag}** foi identificado e está autorizado.`)
            .addFields(
                { name: '👤 Usuário Alvo', value: `<@${targetUser.id}>`, inline: true },
                { name: '🆔 Discord ID', value: `\`${targetUser.id}\``, inline: true },
                { name: '🛠️ Autorizado por', value: `<@${interaction.user.id}>`, inline: false },
                { name: '📊 Status', value: 'Pronto para sincronização Steam Hex na Dashboard', inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: 'Magnatas.gg • Sistema de Vínculo Restrito', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
