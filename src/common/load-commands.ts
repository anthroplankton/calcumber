import {
    SlashCommandBuilder as DjsSlashCommandBuilder,
    ContextMenuCommandBuilder as DjsContextMenuCommandBuilder,
} from '@discordjs/builders'
import fs from 'fs/promises'
import path from 'path/posix'
import { nodeEnv } from './load-env.js'
import { SlashCommandBuilder, ContextMenuCommandBuilder, ButtonCover, SelectMenuCover } from './interactive.js'

type CommandModuleName = string
type DjsCommandBuilder = DjsSlashCommandBuilder | DjsContextMenuCommandBuilder

export async function getCommandModuleNames() {
    const files = await fs.readdir(path.join(nodeEnv == 'production' ? 'dist' : 'src', 'commands'))
    return files
        .map(file => path.parse(file))
        .filter(parsedPath => parsedPath.ext == '.ts' || parsedPath.ext == '.js')
        .map(parsedPath => parsedPath.name)
}

export async function loadCommandModules(commandModuleNames?: CommandModuleName[]) {
    commandModuleNames ||= await getCommandModuleNames()
    return await Promise.all(
        commandModuleNames.map(name => import(path.format({ dir: '../commands', name, ext: '.js' })))
    )
}

export async function loadCommandBuilders(commandModuleNames?: CommandModuleName[]) {
    const commandModules = await loadCommandModules(commandModuleNames)
    return commandModules
        .map(Object.entries)
        .flat()
        .filter((entry): entry is [string, DjsCommandBuilder] => {
            const [, obj] = entry
            return obj instanceof DjsSlashCommandBuilder || obj instanceof DjsContextMenuCommandBuilder
        })
        .map(([name, command]) => command.setName(command.name || name))
}

export async function loadInteractives(commandModuleNames?: CommandModuleName[]) {
    const commandModules = await loadCommandModules(commandModuleNames)
    const slashCommandBuilders: SlashCommandBuilder[] = []
    const contextMenuCommandBuilders: ContextMenuCommandBuilder[] = []
    const buttonCovers: ButtonCover[] = []
    const selectMenuCovers: SelectMenuCover[] = []
    for (const [key, obj] of commandModules.map(Object.entries).flat()) {
        if (obj instanceof SlashCommandBuilder) {
            slashCommandBuilders.push(obj.setName(obj.name ?? key))
        } else if (obj instanceof ContextMenuCommandBuilder) {
            contextMenuCommandBuilders.push(obj.setName(obj.name ?? key))
        } else if (obj instanceof ButtonCover) {
            buttonCovers.push(obj.setCustomId(obj.customId ?? key))
        } else if (obj instanceof SelectMenuCover) {
            selectMenuCovers.push(obj.setCustomId(obj.customId ?? key))
        }
    }
    return {
        slashCommandBuilders,
        contextMenuCommandBuilders,
        buttonCovers,
        selectMenuCovers,
    }
}
