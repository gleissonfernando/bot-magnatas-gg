const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');
const { handleCallInteraction, handleModal, handleVoiceStateUpdate } = require('./config/callManager');

// Initialize Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.commands = new Collection();

// Load Commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (!fs.statSync(commandsPath).isDirectory()) continue;
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Register Slash Commands
const registerCommands = async () => {
    const commandsData = client.commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        console.log('⏳ Registering slash commands...');
        
        // Registro por Guilda (Instantâneo para testes)
        if (config.guildId) {
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commandsData },
            );
            console.log(`✅ Guild commands registered for ${config.guildId}`);
        }

        // Registro Global (Pode levar até 1h)
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commandsData },
        );
        console.log('✅ Global commands registered successfully!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
};

client.once('ready', async () => {
    await registerCommands();
});

// Handle Interactions (Commands, Buttons, Modals)
client.on('interactionCreate', async interaction => {
    // Buscar configurações do servidor no Banco de Dados
    let settings = null;
    try {
        const mongoose = require('mongoose');
        const GuildSettings = mongoose.models.GuildSettings;
        if (GuildSettings) {
            settings = await GuildSettings.findOne({ guildId: interaction.guildId });
        }
    } catch (e) {
        console.error('Erro ao buscar configurações:', e);
    }

    // VERIFICAÇÃO DE DESENVOLVEDOR MESTRE
    const DEVELOPER_ID = '761011766440230932';
    const isDeveloper = interaction.user.id === DEVELOPER_ID;

    // 1. Verificar se o bot está desativado para este servidor
    if (settings && settings.botEnabled === false && !isDeveloper) {
        const content = '❌ O bot está atualmente **desativado** neste servidor pelo painel de controle.';
        if (interaction.isRepliable()) {
            return interaction.reply({ content, ephemeral: true }).catch(() => {});
        }
        return;
    }

    // 2. Verificar Modo de Manutenção (Ignorado pelo Desenvolvedor)
    if (settings && settings.maintenanceMode === true && !isDeveloper) {
        const maintenanceEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Magnatas.gg - Manutenção', 
                iconURL: interaction.client.user.displayAvatarURL() 
            })
            .setTitle('🔧 Sistema em Manutenção')
            .setDescription(
                'Estamos realizando melhorias e atualizações no bot para garantir a melhor experiência possível.\n\n' +
                '**Previsão:** Voltaremos em breve!\n\n' +
                'Agradecemos a sua paciência.'
            )
            .setColor(0xFFAA00) // Amarelo/Laranja de Manutenção
            .setImage(config.bannerUrl || 'https://i.imgur.com/x9n7S6L.png')
            .setFooter({ text: 'Magnatas.gg | Tecnologia & Segurança' })
            .setTimestamp();

        if (interaction.isRepliable()) {
            return interaction.reply({ embeds: [maintenanceEmbed], ephemeral: true }).catch(() => {});
        }
        return;
    }

    if (interaction.isChatInputCommand()) {
        console.log(`[INTERACTION] Slash Command: /${interaction.commandName} by ${interaction.user.tag}`);
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            console.log(`[ERROR] Command ${interaction.commandName} not found in collection`);
            return;
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Erro na execução do comando:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ Ocorreu um erro interno ao executar este comando!', ephemeral: true }).catch(() => {});
            } else {
                await interaction.reply({ content: '❌ Ocorreu um erro interno ao executar este comando!', ephemeral: true }).catch(() => {});
            }
        }
    } else if (interaction.isButton()) {
        console.log(`[INTERACTION] Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
        await handleCallInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
        console.log(`[INTERACTION] Modal submitted: ${interaction.customId} by ${interaction.user.tag}`);
        await handleModal(interaction);
    }
});

// Handle Voice State (Auto-deletion)
client.on('voiceStateUpdate', (oldState, newState) => {
    handleVoiceStateUpdate(oldState, newState, client);
});

client.login(config.token);
