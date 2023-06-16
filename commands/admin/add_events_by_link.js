const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const submitTimeLimit = 1.08e+7;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add_events_by_link')
        .setDescription('Allows users to add a specific event via link to ISU page')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    /** @param {import('discord.js').Interaction} interaction  */
    async execute(interaction) {
        // Create the modal
        const modal = new ModalBuilder()
            .setCustomId('addEventModal')
            .setTitle('Add Event(s)');

        // Add components to modal
        const linkInput = new TextInputBuilder()
            .setCustomId('linkInput')
            .setLabel("Input competition link(s)")
            .setPlaceholder(`isu.org pages ONLY, sperate links with a new line.`)
            // Paragraph means multiple lines of text.
            .setStyle(TextInputStyle.Paragraph)
            // require a value in this input field
            .setRequired(true);

        // An action row only holds one text input,
        // so you need one action row per text input.
        const firstActionRow = new ActionRowBuilder().addComponents(linkInput);

        // Add inputs to the modal
        modal.addComponents(firstActionRow);

        // Show the modal to the user
        await interaction.showModal(modal);

  /*       const filter = (interaction) => interaction.customId === 'addEventModal';
        interaction.awaitModalSubmit({ filter, time: 1000 })
            .then(interaction => console.log(`${interaction.customId} was submitted!`))
            .catch(console.error); */
    },
}
