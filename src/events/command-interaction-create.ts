import type { CommandInteraction } from 'discord.js'
import type { ToAPIApplicationCommandOptions } from '@discordjs/builders'
import type {
    SlashCommandOption,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandSubcommandBuilder,
} from '../common/interactive'

import { Permissions } from 'discord.js'
import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import chalk from 'chalk'
import { BaseInteractionCreate } from './base-interaction-create.js'
import { LogPath, LogTree } from '../common/log.js'
import { SlashCommandBuilder, ApplicationCommandOptionTypeNames } from '../common/interactive.js'

type SlashCommandBuilderFamily =
    | SlashCommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | SlashCommandSubcommandBuilder
type SlashCommandBuilderNode = {
    builder: SlashCommandBuilderFamily
    children: Map<string, SlashCommandBuilderNode>
}
type SlashCommandBuilderMap = Map<string, SlashCommandBuilderNode>

function isSubcommandGroup(option: ToAPIApplicationCommandOptions): option is SlashCommandSubcommandGroupBuilder {
    return option.toJSON().type === ApplicationCommandOptionType.SubcommandGroup
}

function isSubcommand(option: ToAPIApplicationCommandOptions): option is SlashCommandSubcommandBuilder {
    return option.toJSON().type === ApplicationCommandOptionType.Subcommand
}

export class CommandInteractionCreate extends BaseInteractionCreate<
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandBuilderNode
> {
    public constructor() {
        super('slash comamnd')
    }

    public override *registeredInteractives() {
        for (const { builder } of this._interactiveMap.values()) {
            yield builder as SlashCommandBuilder
        }
    }

    public override setInteractive(builder: SlashCommandBuilderFamily) {
        this._setInteractive(builder, this._interactiveMap)
    }

    private _setInteractive(builder: SlashCommandBuilderFamily, map: SlashCommandBuilderMap) {
        const children: SlashCommandBuilderMap = new Map()
        map.set(builder.name, { builder, children })
        for (const option of builder.options) {
            if (isSubcommandGroup(option)) {
                this._setInteractive(option, children)
            } else if (isSubcommand(option)) {
                this._setInteractive(option, children)
            }
        }
    }

    public override getInteractive(
        interaction: CommandInteraction
    ): [builderNode: SlashCommandBuilderNode | undefined, commandPath: LogPath] {
        const { commandName, options } = interaction
        const subcommandGroupName = options.getSubcommandGroup(false)
        const subcommandName = options.getSubcommand(false)
        const commandPath = new LogPath()
        let [node, commandPathTail] = this._getSlashCommandBuilderNode(this._interactiveMap, commandName, commandPath)
        if (node !== undefined && subcommandGroupName !== null) {
            void ([node, commandPathTail] = this._getSlashCommandBuilderNode(
                node.children,
                subcommandGroupName,
                commandPathTail
            ))
        }
        if (node !== undefined && subcommandName !== null) {
            void ([node] = this._getSlashCommandBuilderNode(node.children, subcommandName, commandPathTail))
        }
        return [node, commandPath]
    }

    private _getSlashCommandBuilderNode(
        map: SlashCommandBuilderMap,
        name: string,
        commandPath: LogPath
    ): [node: SlashCommandBuilderNode | undefined, nextCommandPath: LogPath] {
        commandPath = commandPath.setNext(new LogPath().setName(name))
        const node = map.get(name)
        return [node, commandPath]
    }

    public override async interact(interaction: CommandInteraction, builderNode: SlashCommandBuilderNode) {
        const builder = builderNode.builder as SlashCommandBuilder | SlashCommandSubcommandBuilder
        const optionEntries = (builder.options as SlashCommandOption[]).map(({ type, name, required }) => [
            name,
            this._getInteractionOption(interaction.options, type, name, required),
        ])
        const options = Object.fromEntries(optionEntries)
        await builder.interactor(interaction, options)
    }

    private _getInteractionOption(
        options: CommandInteraction['options'],
        type: SlashCommandOption['type'],
        name: string,
        required: boolean
    ) {
        const typeName = ApplicationCommandOptionTypeNames[type]
        return options[`get${typeName}`](name, required)
    }

    public override makeLogTree() {
        return this._makeLogTree(this._interactiveMap)
    }

    private _makeLogTree(map: SlashCommandBuilderMap) {
        const logTree = new LogTree()
        for (const [name, { builder, children }] of map) {
            const child = children.size
                ? this._makeLogTree(children)
                : this._makeOptionsLogTree(builder.options as SlashCommandOption[])

            logTree.addChildren(child.setName(name))

            if (!(builder instanceof SlashCommandBuilder)) {
                continue
            }
            const permissionStrings: string[] = [...builder.permissionsKeys]
            if (builder.default_member_permissions != null) {
                const permissions = new Permissions(
                    BigInt(builder.default_member_permissions) ^ Permissions.ALL
                ).serialize()
                permissionStrings.push(
                    ...Object.entries(permissions)
                        .filter(([, value]) => !value)
                        .map(([key]) => key)
                )
            }
            if (permissionStrings.length || builder.default_member_permissions != null) {
                child.setValue(chalk.bgGray('@' + permissionStrings.join('|')))
            }
        }
        return logTree
    }

    private _makeOptionsLogTree(options: readonly SlashCommandOption[]) {
        const logTree = new LogTree()
        for (const { type, name, required } of options) {
            const typeName = ApplicationCommandOptionTypeNames[type]
            const child = new LogTree().setName(name).setValue(required ? typeName : `?${typeName}`)
            logTree.addChildren(child)
        }
        return logTree
    }
}
