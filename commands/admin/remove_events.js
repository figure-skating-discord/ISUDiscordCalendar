const { SlashCommandBuilder, GuildScheduledEvent, Collection, PermissionFlagsBits} = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { loadingBar } = require('../../helperFunctions/loadingBar.js')

module.exports = {
        data: new SlashCommandBuilder()
                .setName('remove_events')
                .setDescription('removes_guild_scheduled_events')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Deletes all events made by this user. Leave blank to delete all events')
                        .setRequired(false)),

        async execute(interaction) {
                await interaction.deferReply()
                const eventManager = interaction.guild.scheduledEvents
                let eventCollection = await eventManager.fetch();
                let reply = ['**The following Events are being removed:**'];
                //store the data in an array
                let targetUser = await interaction.options.getUser('user')
                if (targetUser) {
                    //console.log(eventMap)
                    let [targetEvents, nonTargetEvents] = eventCollection.partition(scheduledEvent => scheduledEvent.creator.id == targetUser.id)
                    targetEvents = [...targetEvents.values()];
                    if (targetEvents.length == 0) {
                        await interaction.editReply({content: `${targetUser} has not made any active events in this server!`});
                        return;
                    }
                    for (let i = 0; i < targetEvents.length; i++) {
                        if (reply.findLast(e => e === e).length + targetEvents[i].name.length >= 2000) {
                            reply.push(targetEvents[i].name);
                        }
                        else reply[reply.length-1] += `\n${targetEvents[i].name}`
                    }
                    await interaction.editReply({content: reply[0]});
                    for(let i = 1; i < reply.length; i++) {
                        await interaction.followUp({content: reply[i]})
                    }
                    let eventNum = 0;
                    let progress = await interaction.followUp({content: `Progess: ${eventNum}/${targetEvents.length}`}); 
                    //console.log("Progress:", progress)   
                    for (let i = 0; i < targetEvents.length; i++) {
                        await targetEvents[i].delete()
                        eventNum++;
                        //console.log(`Progess: ${eventNum}/${targetEvents.length}`)
                        await progress.edit({content: `Progess: ${eventNum}/${targetEvents.length}\n${loadingBar(eventNum, targetEvents.length)}`})
                    }
                }
                else {
                    eventCollection = [...eventCollection.values()]
                    if (eventCollection.length == 0) {
                        await interaction.editReply({content: `There are no active events in this server!`});
                        return;
                    }
                    for (let i = 0; i < eventCollection.length; i++) {
                        if (reply.findLast(e => e === e).length + eventCollection[i].name.length >= 2000) {
                            reply.push(eventCollection[i].name);
                        }
                        else reply[reply.length-1] += `\n${eventCollection[i].name}`
                    }
                    await interaction.editReply({content: reply[0]});
                    for(let i = 1; i < reply.length; i++) {
                        await interaction.followUp({content: reply[i]})
                    }
                    let eventNum = 0;
                    let progress = await interaction.followUp({content: `Progess: ${eventNum}/${eventCollection.length}\n${loadingBar(eventNum, eventCollection.length)}`}); 
                    //console.log("Progress:", progress)   
                    for (let i = 0; i < eventCollection.length; i++) {
                        await eventCollection[i].delete()
                        eventNum++;
                        //console.log(`Progess: ${eventNum}/${eventCollection.length}`)
                        await progress.edit({content: `Progess: ${eventNum}/${eventCollection.length}\n${loadingBar(eventNum, eventCollection.length)}`})
                    }
                    await progress.edit({content: `Progess: Complete! (${eventNum}/${eventCollection.length})\n${loadingBar(eventNum, eventCollection.length)}`})
                }
            }
}