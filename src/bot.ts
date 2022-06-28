import { inspect } from 'util'
import chalk, { supportsColor } from 'chalk'
import PrettyError from 'pretty-error'
import sourceMapSupport from 'source-map-support'
import client from './common/client.js'
import { token } from './common/load-env.js'
import logger from './common/log.js'
import { loadInteractives } from './common/load-commands.js'
import interactionCreate from './events/interaction-create.js'

inspect.defaultOptions.depth = 4
inspect.defaultOptions.colors = Boolean(supportsColor)
PrettyError.start()
sourceMapSupport.install()

process.on('SIGINT', () => {
    client.destroy()
    logger.info('Interruption! Client is Destroyed!')
    process.exit()
})

process.on('SIGTERM', () => {
    client.destroy()
    logger.info('Termination! Client is Destroyed!')
    process.exit()
})

process.on('unhandledRejection', err => {
    logger.error('Unhandled promise rejection.', err)
})

client.on('error', logger.error)

client.on('interactionCreate', interactionCreate.listener)

client.once('ready', client => {
    // Change terminal title
    process.stdout.write(`\x1b]0;${client.user.tag}\x07`)
    logger.info(`Ready! Logged in as ${chalk.bgGreen(chalk.black(client.user.tag))}.`)
})

loadInteractives().then(interactionCreate.register)

client.login(token)
