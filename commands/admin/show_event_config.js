const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder} = require('discord.js');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('show_event_config')
                .setDescription('Allows users to configure which events are posted by the bot')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .setDMPermission(false),

                async execute(interaction) {
                        //these are not all the embed options see the api doc
                        const embed = new EmbedBuilder()
                        .setTitle('Set Event Creation Preferences')
                        .setDescription('Filler Text . . .')
                        .setColor('purple')
                        .addFields(
                            {
                                name: 'field 1',
                                value: 'example text',
                                inline: true
                            },
                            {
                                name: "field 2",
                                value: "test 2",
                                inline: true
                            }
                        )
        
                        await interaction.reply({
                            content: 'text reply',
                            //10 embed per reply limit
                            embeds: [embed],
                            //ephemeral makes it so only command user sees reply
                            ephemeral: true,
                        })
                }
}