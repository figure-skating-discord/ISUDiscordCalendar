import { Client, Collection, GatewayIntentBits } from 'discord.js'
import fs from 'fs'
import path from 'path'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const getCommands = async (dir) => {
  const commands = new Collection()
  const commandFiles = getFiles(dir)

  for (const commandFile of commandFiles) {
    const { default: command } = await import('file://' + commandFile)
    commands.set(command.data.toJSON().name, command)
  }
  return commands
}

const getFiles = (dir) => {
  const files = fs.readdirSync(dir, {
    withFileTypes: true,
  })
  let commandFiles = []

  for (const file of files) {
    if (file.isDirectory()) {
      commandFiles = [...commandFiles, ...getFiles(`${dir}/${file.name}`)]
    } else if (file.name.endsWith('.js')) {
      commandFiles.push(`${dir}/${file.name}`)
    }
  }
  return commandFiles
}

client.commands = getCommands(
  path.join(path.dirname(import.meta.url.substring(8)), '../commands'),
)
export default {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return

    const command = client.commands.get(interaction.commandName, false)

    try {
      if (interaction.replied) return
      command.execute(interaction)
    } catch (error) {
      console.error(error)
    }
  },
}
