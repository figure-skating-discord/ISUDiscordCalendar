const { SlashCommandBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
        data: new SlashCommandBuilder()
                .setName('defer')
                .setDescription('sends a defered message'),

        async execute(interaction) {
            //normal reply only has 3 seconds to respond
            //deferReply has about 15 minutes
            await interaction.deferReply({ephemeral: true})
            await wait(2000);
            await interaction.editReply({content: "Hello"})


            //await interaction.fetchReply({})
            await interaction.followUp({content: "Hello 2"})
        }
}