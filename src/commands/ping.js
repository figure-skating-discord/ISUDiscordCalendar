import { SlashCommandBuilder } from 'discord.js'

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with "pong"'),

  async execute(interaction) {
    interaction.reply("pong you're an admin")
  },
}
