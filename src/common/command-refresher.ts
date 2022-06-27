import type { Snowflake } from 'discord.js'
import type {
    APIApplicationCommandPermission,
    RESTPutAPIApplicationCommandsResult,
    RESTPutAPIGuildApplicationCommandsPermissionsJSONBody,
} from 'discord-api-types/v10'

import { APIApplicationCommand, ApplicationCommandType, Routes } from 'discord-api-types/v10'
import {
    SlashCommandBuilder as DjsSlashCommandBuilder,
    ContextMenuCommandBuilder as DjsContextMenuCommandBuilder,
} from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { SlashCommandBuilder, ContextMenuCommandBuilder } from './interactive.js'
import { clientId, token } from './load-env.js'
import logger from './log.js'
import {
    validateChatInputCommandAmount,
    validateUserCommandAmount,
    validateMessageCommandAmount,
} from '../assertions/application-command-assertions.js'

type CommandModuleName = string
type PermissionsKey = string
type DjsCommandBuilder = DjsSlashCommandBuilder | DjsContextMenuCommandBuilder

export abstract class BaseCommandRefresher {
    public async refresh(commandModuleNames: CommandModuleName[], guildId?: Snowflake) {
        const loadCommandBuildersTask = this._loadCommandBuilders(commandModuleNames)
        const putCommandsTask = loadCommandBuildersTask.then(command => this._putCommands(command, guildId))
        const permissionsMap =
            guildId === undefined ? undefined : await this._loadAPIApplicationCommandPermissionsMap(guildId)
        const putCommandsResult = await putCommandsTask
        const commandBuilders = await loadCommandBuildersTask
        const commandBuilderMap = new Map(commandBuilders.map(command => [command.name, command]))

        if (permissionsMap === undefined || guildId === undefined) {
            return
        }
        await this._putPermissions(permissionsMap, putCommandsResult, commandBuilderMap, guildId)
    }

    protected abstract _loadCommandBuilders(commandModuleNames: CommandModuleName[]): Promise<DjsCommandBuilder[]>

    protected async _loadAPIApplicationCommandPermissionsMap(
        guildId: Snowflake
    ): Promise<Map<PermissionsKey, APIApplicationCommandPermission[]>>
    protected async _loadAPIApplicationCommandPermissionsMap() {
        return new Map()
    }

    private async _putCommands(command: DjsCommandBuilder[], guildId?: Snowflake) {
        const commandJSONs = command.map(command => command.toJSON())

        let nChatInputCommand = 0,
            nUserCommand = 0,
            nMessageCommand = 0
        for (const { type } of commandJSONs) {
            switch (type) {
                case undefined:
                case ApplicationCommandType.ChatInput:
                    nChatInputCommand += 1
                    validateChatInputCommandAmount(nChatInputCommand)
                    break
                case ApplicationCommandType.User:
                    nUserCommand += 1
                    validateUserCommandAmount(nUserCommand)
                    break
                case ApplicationCommandType.Message:
                    nMessageCommand += 1
                    validateMessageCommandAmount(nMessageCommand)
                    break
            }
        }

        const rest = new REST().setToken(token)
        const route =
            guildId === undefined
                ? Routes.applicationCommands(clientId)
                : Routes.applicationGuildCommands(clientId, guildId)

        logger.info('Started refreshing application (/) commands.')

        console.log(guildId)
        const Result = await rest.put(route, { body: commandJSONs })

        logger.debug('Response', Result)
        logger.info('Successfully refreshed application (/) commands.')

        return Result as RESTPutAPIApplicationCommandsResult
    }

    private async _putPermissions(
        permissionsMap: Map<PermissionsKey, APIApplicationCommandPermission[]>,
        commands: APIApplicationCommand[],
        commandBuilderMap: Map<CommandModuleName, DjsCommandBuilder>,
        guildId: Snowflake
    ) {
        const body: RESTPutAPIGuildApplicationCommandsPermissionsJSONBody = []
        for (const { id, name } of commands) {
            const command = commandBuilderMap.get(name)
            if (!(command instanceof SlashCommandBuilder) && !(command instanceof ContextMenuCommandBuilder)) {
                continue
            }
            const permissions = command.permissionsKeys
                .map(key => {
                    const permissions = permissionsMap.get(key)
                    if (permissions === undefined) {
                        throw new Error(`The permissions of the key "${key}" was not be found.`)
                    }
                    return permissions
                })
                .flat()
            body.push({ id, permissions })
        }

        const rest = new REST().setToken(token)

        logger.info('Started edit application (/) commands permissions.')

        const Result = await rest.put(Routes.guildApplicationCommandsPermissions(clientId, guildId), { body })

        logger.debug('Response', Result)
        logger.info('Successfully edited application (/) commands permissions.')
    }
}
