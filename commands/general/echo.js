const { SlashCommandBuilder } = require('discord.js');

module.exports = {
 data: new SlashCommandBuilder()
 .setName('echo')
    .setDescription('Repeats what the user says')
    .addStringOption(option => 
        option
            .setName('text')
            .setDescription('text to repeated')
            .setRequired(true)
    ),

 async execute(interaction){
    interaction.reply(`${interaction.options.getString('text')}`);
 }
}