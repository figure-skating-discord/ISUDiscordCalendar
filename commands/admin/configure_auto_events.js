const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure_auto_events')
        .setDescription('Allows users to configure which events are posted by the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction) {
        //these are not all the embed options see the api doc
        const embed = new EmbedBuilder()
            .setTitle('Set Event Creation Preferences')
            .setDescription('Click the all button to toggle scrapping all events')
            .setColor(0x454894)

        const enableAll = new ButtonBuilder()
            .setCustomId('EnableAllEvents')
            .setLabel('Enable All Events')
            .setStyle(ButtonStyle.Success)
            .setDisabled(false);

        const disableAll = new ButtonBuilder()
            .setCustomId('DisableAllEvents')
            .setLabel('Disable All Events')
            .setStyle(ButtonStyle.Success)
            .setDisabled(false);

        const source = new ButtonBuilder()
            .setLabel('ISU Event Source')
            .setURL('https://www.isu.org/figure-skating/events/figure-skating-calendar')
            .setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder()
            .addComponents(enableAll, disableAll, source);

        await interaction.reply({
            content: '',
            //10 embed per reply limit
            embeds: [embed],
            //ephemeral makes it so only command user sees reply
            ephemeral: false,
            components: [row],
        });
    }
}