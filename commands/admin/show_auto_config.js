const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getFiles } = require('../../helperFunctions/getFiles.js')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('show_auto_config')
		.setDescription('Shows the current settings for auto updating events in this server')
		.setDMPermission(false),

	async execute(interaction) {
		const files = getFiles(`${__dirname}/../../guildSettingsFiles`, 'json')

		let autoUpdateFields = [];

		let targetFilePattern = new RegExp(`.*${interaction.guildId}\\.json.*`)
		let settings;
		let calendars;

		for (const file of files) {
			if (file.match(targetFilePattern)) {
				let settings = require(file)
				const cals = settings.autoAddEvents.calendars
				let i = 0;
				autoUpdateFields = Object.keys(cals).map((cal) => {
					let field = {
						name: `__${cal.match(/[A-Z][a-z]+|[0-9]+/g).join(" ")}__`,
						value: `
				**\`Update Interval: \`** **${cals[cal].interval} Hour(s)**
				**\`Number of Events:\`** **${cals[cal].numEvents}**
				**\`Filters:		 \`** **None**`,
					}
					i++;
					return field
				})
			}
		}

		//these are not all the embed options see the api doc
		const embed = new EmbedBuilder()
			.setTitle(`Auto Updating Event Settings For ${interaction.guild}`)
			.setDescription('Current calendars being auto populated to this server:')
			.setColor(0x454894)
			//.setTimestamp()
			.addFields(
				...(autoUpdateFields.length ? autoUpdateFields : [{
					name: `None`,
					value: ` `
				}])
			)
			.addFields({ name: ' ', value: '*Developed by: <@109931759260430336>*'})
		await interaction.reply({
			embeds: [embed],

		})

	}
}