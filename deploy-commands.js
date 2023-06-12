const fs = require('node:fs');
const path = require('node:path');
const { REST } = require('@discordjs/rest');
const { Routes, Client } = require('discord.js');
const { TOKEN, GUILD_ID, CLIENT_ID } = require('./config.json');

const clear_commands = false;

function getFiles(dir) {
    const files = fs.readdirSync(dir, {
        withFileTypes: true
    });
    let commandFiles = [];

    for (const file of files) {
        if (file.isDirectory()) {
            commandFiles = [
                ...commandFiles,
                ...getFiles(`${dir}/${file.name}`)
            ]
        } else if (file.name.endsWith('.js')) {
            commandFiles.push(`${dir}/${file.name}`)
        }
    }
    return commandFiles;
}

let commands = [];
const commandFiles = getFiles('./commands');

for (const file of commandFiles) {
    const command = require(file);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

if (clear_commands) {
    //Clearing Current Command Cache First
    // for guild-based commands
    rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] })
        .then(() => console.log('Successfully deleted all guild commands.'))
        .catch(console.error);

    // for global commands
    rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] })
        .then(() => console.log('Successfully deleted all application commands.'))
        .catch(console.error)
        .then(() => {
            //Adding current commands to cache
            rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
                .then(() => { console.log('Successfully registered application commands') })
                .catch(console.error);
        });
} else {
    
//Adding current commands to cache
rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
    .then(() => { console.log('Successfully registered application commands') })
    .catch(console.error);

}