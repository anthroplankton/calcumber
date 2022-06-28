import type { Interaction } from 'discord.js'
import type {
    SlashCommandBuilder,
    ContextMenuCommandBuilder,
    ButtonCover,
    SelectMenuCover,
} from '../common/interactive'
import type { BaseInteractionCreate } from './base-interaction-create.js'

import chalk from 'chalk'
import { CommandInteractionCreate } from './command-interaction-create.js'
import { ContextMenuInteractionCreate } from './context-menu-interaction-create.js'
import { ButtonInteractionCreate, SelectMenuInteractionCreate } from './message-component-interaction-create.js'
import logger from '../common/log.js'

const commandInteractionCreate = new CommandInteractionCreate()
const contextMenuInteractionCreate = new ContextMenuInteractionCreate()
const buttonInteractionCreate = new ButtonInteractionCreate()
const selectMenuInteractionCreate = new SelectMenuInteractionCreate()

export function register(interactives: {
    slashCommandBuilders: SlashCommandBuilder[]
    contextMenuCommandBuilders: ContextMenuCommandBuilder[]
    buttonCovers: ButtonCover[]
    selectMenuCovers: SelectMenuCover[]
}) {
    const { slashCommandBuilders, contextMenuCommandBuilders, buttonCovers, selectMenuCovers } = interactives
    separatelyRegister(commandInteractionCreate, slashCommandBuilders)
    separatelyRegister(contextMenuInteractionCreate, contextMenuCommandBuilders)
    separatelyRegister(buttonInteractionCreate, buttonCovers)
    separatelyRegister(selectMenuInteractionCreate, selectMenuCovers)
}

function separatelyRegister<
    T extends BaseInteractionCreate<TInteraction, TInteractive, TEndInteractive>,
    TInteraction extends Interaction,
    TInteractive,
    TEndInteractive
>(lisenter: T, interactives: TInteractive[]) {
    lisenter.register(...interactives)
    logger.event('Preparation Completed', chalk.bgBlue(lisenter.name), lisenter.makeLogTree())
}

export async function listener(interaction: Interaction) {
    try {
        if (interaction.isCommand()) {
            await emit(commandInteractionCreate, interaction)
        } else if (interaction.isContextMenu()) {
            await emit(contextMenuInteractionCreate, interaction)
        } else if (interaction.isButton()) {
            await emit(buttonInteractionCreate, interaction)
        } else if (interaction.isSelectMenu()) {
            await emit(selectMenuInteractionCreate, interaction)
        }
    } catch (err) {
        logger.error(`While executing some interaction.`, err)
        await replyError(interaction)
    }
}

async function emit<
    T extends BaseInteractionCreate<TInteraction, TInteractive, TEndInteractive>,
    TInteraction extends Interaction,
    TInteractive,
    TEndInteractive
>(lisenter: T, interaction: TInteraction) {
    const [interactive, interactionPath] = lisenter.getInteractive(interaction)
    logger.event('Interaction Create', chalk.bgBlue(lisenter.name), interactionPath)
    try {
        if (interactive == undefined) {
            throw new Error(`The interaction is not registered.`)
        }
        await lisenter.interact(interaction, interactive)
    } catch (err) {
        logger.error(`While executing the ${lisenter.name} interaction ${interactionPath}.`, err)
        await replyError(interaction)
    }
}

async function replyError(interaction: Interaction) {
    if (interaction.isApplicationCommand()) {
        const reply = {
            content: 'There was an error while executing this command!',
            ephemeral: interaction.ephemeral ?? true,
        }
        await (interaction.replied ? interaction.followUp(reply) : interaction.reply(reply))
    } else if (interaction.isMessageComponent()) {
        const reply = {
            content: 'There was an error while replying this message component!',
            ephemeral: interaction.ephemeral ?? true,
        }
        await Promise.all([
            interaction.update({
                components: [],
            }),
            interaction.followUp(reply),
        ])
    }
}

export default { listener, register }
