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
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commandsData },
        );
        console.log('✅ Commands registered successfully!');
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

    // 1. Verificar se o bot está desativado para este servidor
    if (settings && settings.botEnabled === false) {
        const content = '❌ O bot está atualmente **desativado** neste servidor pelo painel de controle.';
        if (interaction.isRepliable()) {
            return interaction.reply({ content, ephemeral: true }).catch(() => {});
        }
        return;
    }

    // 2. Verificar Modo de Manutenção
    if (settings && settings.maintenanceMode === true) {
        const content = '🔧 O bot está em **modo de manutenção** para atualizações. Por favor, tente novamente mais tarde.';
        if (interaction.isRepliable()) {
            return interaction.reply({ content, ephemeral: true }).catch(() => {});
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
