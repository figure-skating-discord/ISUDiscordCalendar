import { Client, GatewayIntentBits } from 'discord.js'
import { readFile, readdir } from 'fs/promises'
import { dirname, join } from 'path'

const cwd = dirname(import.meta.url.substring(8))
const { TOKEN } = JSON.parse(
  (await readFile(join(cwd, 'config.json'))).toString(),
)

const client = new Client({
  intents:
    [GatewayIntentBits.Guilds] |
    [GatewayIntentBits.GuildMembers] |
    [GatewayIntentBits.GuildMessages],
})

const eventsPath = join(cwd, 'events')
const eventFiles = (await readdir(eventsPath)).filter((file) =>
  file.endsWith('.js'),
)

for (const file of eventFiles) {
  const filePath = join(eventsPath, file)
  const event = await import('file://' + filePath)
  event.once === true
    ? client.once(event.name, (...args) => event.execute(...args))
    : client.on(event.name, (...args) => event.execute(...args))
}
await client.login(TOKEN)
