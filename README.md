# ISU Discord Calendar Usage
All Events are pulled from event calendars located on the [ISU's website](https://www.isu.org/). Additionally, all commands require admin permissions on the server they're being used on by default.

## Commands:
<table >
<thead>
  <tr>
    <th>Command</th>
    <th>Description/Usage</th>
  </tr>
</thead>
<tbody valign="top">
  <tr>
    <td>add_events_by_link</td>
    <td>Creates a discord modal in which the user can paste links from an ISU event calendar page in order to add scheduled events to the current discord server. this interaction does not time out.</td>
  </tr>
  <tr>
    <td>add_calendar</td>
    <td>Prompts the user with an embed menu response—that only the user that initiated the command may interact with—to add a selected number of events to the current discord server from a selected ISU event calendar page.</td>
  </tr>
  <tr>
    <td>configure_auto_events</td>
    <td>Does the same thing as "add_calendar" command but also prompts the user to input a time interval for which the command will repeat, effectively updating events and adding new events when old events have passed. Multiple calendars can be set to automatically populate the server with events at once but the command must be ran for each calendar. However, if the same calendar is enabled more than once it will simply update the settings for that calendar. Settings will persist between bot restarts.<br><br><ins>In order to remove a calendar from the list of auto populating calendars the user must select the calendar via this command an then select "Disable Auto Events"</ins>.</td>
  </tr>
  <tr>
    <td>show_auto_config</td>
    <td>Shows the current settings for automatically updating events within the server it is used in.</td>
  </tr>
  <tr>
    <td>remove_events</td>
    <td>Removes scheduled events from the user specified within the discord command option. If no user is specified this command will remove all scheduled events.</td>
  </tr>
</tbody>
</table>
