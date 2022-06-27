import type { Interaction } from 'discord.js'
import type { LogPath, LogTree } from '../common/log'

export abstract class BaseInteractionCreate<
    TInteraction extends Interaction,
    TInteractive,
    TEndInteractive = TInteractive
> {
    public readonly name: string
    protected readonly _interactiveMap: Map<string, TEndInteractive>

    public constructor(name: string) {
        this.name = name
        this._interactiveMap = new Map()
    }

    public register(...interactives: TInteractive[]) {
        for (const interactive of interactives) {
            this.setInteractive(interactive)
        }
    }

    public abstract registeredInteractives(): Iterable<TInteractive>
    public abstract setInteractive(interactive: TInteractive): void
    public abstract getInteractive(
        interaction: TInteraction
    ): [interactive: TEndInteractive | undefined, interactionPath: LogPath]
    public abstract interact(interaction: TInteraction, interactive: TEndInteractive): Promise<void>
    public abstract makeLogTree(): LogTree
}
