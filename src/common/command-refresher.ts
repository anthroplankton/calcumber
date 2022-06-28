import type { Snowflake } from 'discord.js'
import type { RESTPostAPIApplicationCommandsJSONBody, RESTPutAPIApplicationCommandsResult } from 'discord-api-types/v10'
import type { SlashCommandBuilder, ContextMenuCommandBuilder } from '@discordjs/builders'

import { ApplicationCommandType, Routes } from 'discord-api-types/v10'
import { REST } from '@discordjs/rest'
import { clientId, token } from './load-env.js'
import {
    validateChatInputCommandAmount,
    validateUserCommandAmount,
    validateMessageCommandAmount,
} from '../assertions/application-command-assertions.js'

type CommandModuleName = string
type CommandBuilder = SlashCommandBuilder | ContextMenuCommandBuilder

export abstract class BaseCommandRefresher {
    public async refresh(commandModuleNames: CommandModuleName[], guildId?: Snowflake) {
        const commandBuilders = await this._loadCommandBuilders(commandModuleNames)
        const commandJSONs = commandBuilders.map(command => command.toJSON())

        this._validateCommandAmount(commandJSONs)

        const rest = new REST().setToken(token)
        const route =
            guildId === undefined
                ? Routes.applicationCommands(clientId)
                : Routes.applicationGuildCommands(clientId, guildId)

        const result = await rest.put(route, { body: commandJSONs })

        return result as RESTPutAPIApplicationCommandsResult
    }

    protected abstract _loadCommandBuilders(commandModuleNames: CommandModuleName[]): Promise<CommandBuilder[]>

    private _validateCommandAmount(commandJSONs: RESTPostAPIApplicationCommandsJSONBody[]) {
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
    }
}
