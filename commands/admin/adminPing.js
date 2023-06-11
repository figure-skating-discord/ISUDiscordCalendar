const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('adminping')
                .setDescription('Replies with "pong". Needs admin perms to use')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .setDMPermission(false),

        async execute(interaction) {
                interaction.reply("pong you're an admin");
        }
}