import { readdir } from 'fs'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord.js'
import { TOKEN, GUILD_ID, CLIENT_ID } from './config.json'

const getFiles = async (dir) => {
  const files = readdir(dir, { withFileTypes: true })
  let commandFiles = []

  for (const file of files) {
    if (file.isDirectory()) {
      commandFiles = [
        ...commandFiles,
        ...(await getFiles(`${dir}/${file.name}`)),
      ]
    } else if (file.name.endsWith('.js')) {
      commandFiles.push(`${dir}/${file.name}`)
    }
  }
  return commandFiles
}

const clearCommands = false
const commandFiles = getFiles('./commands')
const commands = commandFiles.map(async (f) => (await import(f)).default)
const rest = new REST({ version: '10' }).setToken(TOKEN)

if (clearCommands) {
  // Clearing Current Command Cache First
  // for guild-based commands
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: [],
  })
  // for global commands
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] })
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
  console.log('Successfully registered application commands')
} else {
  // Adding current commands to cache
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
  console.log('Successfully registered application commands')
}
