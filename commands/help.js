const { SlashCommandBuilder, EmbedBuilder, Client } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Shows the list of commands and details about their usage and effects')
		.setDMPermission(false),

	async execute(interaction) {
        const developer = `<@109931759260430336>`

		//these are not all the embed options see the api doc
		const embed = new EmbedBuilder()
			.setTitle(` `)
			.setDescription(' ')
			.setColor(0x454894)
			//.setTimestamp()
			.addFields(
                { name: '`\/help`', value: 'You are here :^)' },
		        { name: '`\/add_events_by_link`', value: 'Creates a discord modal in which the user can paste links from an ISU event calendar page in order to add scheduled events to the current discord server. this interaction does not time out.' },
		        { name: '`\/add_calendar`', value: 'Prompts the user with an embed menu response—that only the user that initiated the command may interact with—to add a selected number of events to the current discord server from a selected ISU event calendar page.' },
		        { name: '`\/configure_auto_events`', value: 'Does the same thing as "add_calendar" command but also prompts the user to input a time interval for which the command will repeat, effectively updating events and adding new events when old events have passed.\nMultiple calendars can be set to automatically populate the server with events at once but the command must be ran for each calendar. However, if the same calendar is enabled more than once it will simply update the settings for that calendar. Settings will persist between bot restarts.\n\n__In order to remove a calendar from the list of auto populating calendars the user must select the calendar via this command an then select "Disable Auto Events".__'},
                { name: '`\/show_auto_config`', value: 'Shows the current settings for automatically updating events within the server it is used in.'},
                { name: '`\/remove_events`', value: ' Removes scheduled events from the user specified within the discord command option. If no user is specified this command will remove all scheduled events.'},
                { name: ' ', value: '​\n*Developed by: <@109931759260430336>*'}
                )
		await interaction.reply({
            content: '# Server Commands:',
			embeds: [embed],
		})

	}
}