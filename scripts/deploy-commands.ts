import { Client, Intents } from 'discord.js'
import { inspect } from 'util'
import { supportsColor } from 'chalk'
import PrettyError from 'pretty-error'
import prompts from 'prompts'
import { token } from '../src/common/load-env.js'
import { BaseCommandRefresher } from '../src/common/command-refresher.js'
import { getCommandModuleNames, loadCommandBuilders } from '../src/common/load-commands.js'
import logger from '../src/common/log.js'

inspect.defaultOptions.depth = 4
inspect.defaultOptions.colors = Boolean(supportsColor)
PrettyError.start()

type CommandName = string

class CommandRefresher extends BaseCommandRefresher {
    protected override async _loadCommandBuilders(commandNames?: CommandName[]) {
        return await loadCommandBuilders(commandNames)
    }
}

const guilds: { id?: string; name: string }[] = [{ name: 'Global' }]
const client = new Client({ intents: Intents.FLAGS.GUILDS, presence: { status: 'invisible' } })
const fetchGuildsTask = new Promise<void>(res =>
    client.on('ready', async () => {
        for (const [guildId] of client.guilds.cache) {
            guilds.push(await client.guilds.fetch(guildId))
        }
        client.destroy()
        res()
    })
)
await client.login(token)
await fetchGuildsTask

const commandModuleNames = await getCommandModuleNames()
const { guildId, pickedCommandModuleNames } = await prompts([
    {
        type: 'select',
        name: 'guildId',
        message: 'Select a guild or the global.',
        choices: Array.from(guilds, ({ id, name }) => ({
            title: id ? `${name}#${id}` : name,
            value: id ?? null,
        })),
    },
    {
        type: commandModuleNames.length ? 'multiselect' : null,
        name: 'pickedCommandModuleNames',
        message: 'Pick command modules to deploy.',
        choices: commandModuleNames.map(name => ({
            title: name,
            value: name,
        })),
    },
])

try {
    logger.info('Started refreshing application (/) commands.')
    const result = await new CommandRefresher().refresh(pickedCommandModuleNames, guildId ?? undefined)
    logger.debug('Result', result)
    logger.info('Successfully refreshed application (/) commands.')
} catch (err) {
    logger.error(err)
}
