const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');

module.exports = {
        data: new SlashCommandBuilder()
                .setName('embed')
                .setDescription('sends an embed'),

        async execute(interaction) {
                //these are not all the embed options see the api doc
                const embed = new EmbedBuilder()
                .setTitle('Test Embed')
                .setDescription('Filler Text . . .')
                .setColor('Random')
                .setAuthor({ name: interaction.user.tag, iconURl: interaction.user.displayAvatarURL()})
                .setTimestamp()
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