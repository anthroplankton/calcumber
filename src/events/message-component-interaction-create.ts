import type { MessageComponentInteraction, ButtonInteraction, SelectMenuInteraction } from 'discord.js'
import type { ButtonCover, SelectMenuCover } from '../common/interactive'

import { BaseInteractionCreate } from './base-interaction-create.js'
import { LogPath, LogTree } from '../common/log.js'

export abstract class MessageComponentInteractionCreate<
    TInteraction extends MessageComponentInteraction,
    TCover extends { customId: string }
> extends BaseInteractionCreate<TInteraction, TCover> {
    public override registeredInteractives() {
        return this._interactiveMap.values()
    }

    public override setInteractive(cover: TCover) {
        this._interactiveMap.set(cover.customId, cover)
    }

    public override getInteractive(interaction: TInteraction): [cover: TCover | undefined, componentPath: LogPath] {
        const { customId } = interaction
        const cover = this._interactiveMap.get(customId)
        const componentPath = new LogPath().setName(customId)
        return [cover, componentPath]
    }

    public override makeLogTree() {
        return new LogTree().addChildren(
            ...Array.from(this._interactiveMap.keys(), customId => new LogTree().setName(customId))
        )
    }
}

export class SelectMenuInteractionCreate extends MessageComponentInteractionCreate<
    SelectMenuInteraction,
    SelectMenuCover
> {
    public constructor() {
        super('button')
    }

    public override async interact(interaction: SelectMenuInteraction, cover: SelectMenuCover) {
        await cover.interactor(interaction, interaction.values)
    }
}

export class ButtonInteractionCreate extends MessageComponentInteractionCreate<ButtonInteraction, ButtonCover> {
    public constructor() {
        super('select menu')
    }

    public override async interact(interaction: ButtonInteraction, cover: ButtonCover) {
        await cover.interactor(interaction)
    }
}
