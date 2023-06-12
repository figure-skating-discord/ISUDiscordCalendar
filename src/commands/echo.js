import { SlashCommandBuilder } from 'discord.js'

export default {
  data: new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Repeats what the user says')
    .addStringOption((option) => {
      return option
        .setName('text')
        .setDescription('text to repeated')
        .setRequired(true)
    }),

  async execute(interaction) {
    interaction.reply(`${interaction.options.getString('text')}`)
  },
}
