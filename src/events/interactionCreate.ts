import {
  type ChatInputCommandInteraction,
  Events,
  PermissionsBitField,
  type SelectMenuInteraction,
} from 'discord.js'
import logger from 'logger'
import Event from 'structures/Event'
import { ErrorType } from 'structures/enums'
import startCase from 'lodash/startCase'
import type SelectMenu from 'structures/SelectMenu'
import type Command from 'structures/Command'
import type Client from 'structures/Client'

/**
 * Utility function to check if the client is missing any necessary permissions.
 *
 * @param client - The instantiated client
 * @param interaction - The interaction that spawned the event
 * @param object - The struct that is being executed
 * @returns A list of all missing permissions as strings
 */
const checkClientPermissions = (
  client: Client<true>,
  interaction:
    | ChatInputCommandInteraction<'cached'>
    | SelectMenuInteraction<'cached'>,
  object: Command | SelectMenu,
): string[] => {
  const permissions: string[] =
    interaction.channel
      ?.permissionsFor(client.user)
      ?.missing(object.permissions)
      .map((p) => startCase(String(new PermissionsBitField(p).toArray()))) || []
  return permissions
}

export default new Event(
  Events.InteractionCreate,
  async (client, interaction) => {
    if (!client.isReady()) return

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName)

      // Return if no command
      if (!command) return

      // Reply with error if missing permissions and return
      if (interaction.inCachedGuild()) {
        const permissions = checkClientPermissions(client, interaction, command)
        if (permissions.length != 0) {
          await client.replyWithError(
            interaction,
            ErrorType.MissingPermissions,
            `Sorry ${
              interaction.member
            }, I need the following permissions for this command:\n \`\`\`diff\n- ${permissions.join(
              '\n- ',
            )}\`\`\``,
          )
          return
        }
      }

      // Run command
      try {
        await command.run(client, interaction)
      } catch (err) {
        if (err instanceof Error) logger.error(err.stack)
        else logger.error(err)
      }
    } else if (interaction.isSelectMenu()) {
      const selectMenu = client.selectMenus.get(interaction.customId)

      // Return if no select menu
      if (!selectMenu) return

      // Reply with error if missing permissions and return
      if (interaction.inCachedGuild()) {
        const permissions = checkClientPermissions(
          client,
          interaction,
          selectMenu,
        )
        if (permissions.length != 0) {
          await client.replyWithError(
            interaction,
            ErrorType.MissingPermissions,
            `Sorry ${
              interaction.member
            }, I need the following permissions for this select menu:\n \`\`\`diff\n- ${permissions.join(
              '\n- ',
            )}\`\`\``,
          )
          return
        }
      }

      // Handle select menu update
      try {
        await selectMenu.run(client, interaction)
      } catch (err) {
        if (err instanceof Error) logger.error(err.stack)
        else logger.error(err)
      }
    }
  },
)
