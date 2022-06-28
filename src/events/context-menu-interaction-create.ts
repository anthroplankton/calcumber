import type { ContextMenuInteraction } from 'discord.js'
import type { ContextMenuCommandBuilder } from '../common/interactive'

import { Permissions } from 'discord.js'
import chalk from 'chalk'
import { BaseInteractionCreate } from './base-interaction-create.js'
import { LogPath, LogTree } from '../common/log.js'
import { ApplicationCommandTypeNames } from '../common/interactive.js'

export class ContextMenuInteractionCreate extends BaseInteractionCreate<
    ContextMenuInteraction,
    ContextMenuCommandBuilder
> {
    public constructor() {
        super('context menu')
    }

    public override registeredInteractives() {
        return this._interactiveMap.values()
    }

    public override setInteractive(builder: ContextMenuCommandBuilder) {
        this._interactiveMap.set(builder.name, builder)
    }

    public override getInteractive(
        interaction: ContextMenuInteraction
    ): [builder: ContextMenuCommandBuilder | undefined, commandPath: LogPath] {
        const { commandName } = interaction
        const builder = this._interactiveMap.get(commandName)
        const commandPath = new LogPath().setName(commandName)
        return [builder, commandPath]
    }

    public override async interact(interaction: ContextMenuInteraction, builder: ContextMenuCommandBuilder) {
        const typeName = ApplicationCommandTypeNames[builder.type]
        const options = {
            [typeName.toLowerCase()]: interaction.options[`get${typeName}`](typeName.toLowerCase(), true),
        }
        await builder.interactor(interaction, options)
    }

    public override makeLogTree() {
        const builders = this.registeredInteractives()
        const logTree = new LogTree()
        for (const { type, name, default_member_permissions } of builders) {
            const typeName = ApplicationCommandTypeNames[type]
            const child = new LogTree().setName(name).addChildren(new LogTree().setName('').setValue(typeName))

            logTree.addChildren(child)

            if (default_member_permissions == null) {
                continue
            }

            const permissionsComplement = new Permissions(
                BigInt(default_member_permissions) ^ Permissions.ALL
            ).serialize()

            const permissionStrings = Object.entries(permissionsComplement)
                .filter(([, value]) => !value)
                .map(([key]) => key)

            child.setValue(chalk.bgGray('@' + permissionStrings.join('|')))
        }
        return logTree
    }
}
