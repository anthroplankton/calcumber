import fs from 'fs/promises'
import path from 'path/posix'
import { format } from 'prettier'
import { settingNames, getFilename, importSettingSchema } from '../src/common/load-settings.js'

function infixFilename(filename: string, infix: string) {
    const { dir, name, ext } = path.parse(filename)
    return path.format({ dir, name, ext: infix + ext })
}

const exportJSONSchemaTask = Promise.all(
    settingNames.map(async settingName => {
        const { schema } = await importSettingSchema(settingName)
        await fs.writeFile(
            infixFilename(getFilename(settingName), '.schema'),
            format(JSON.stringify(schema), { parser: 'json' })
        )
    })
)

const schemas = settingNames.map(settingName => {
    let filename = getFilename(settingName)
    const url = infixFilename(filename, '.schema')
    filename = path.normalize(filename)
    const fileMatch = [filename, infixFilename(filename, '.example')]
    return { fileMatch, url }
})

const vscodeSettingsJSONFilename = './.vscode/settings.json'
const vscodeSettingsJSON = JSON.parse(await fs.readFile(vscodeSettingsJSONFilename, 'utf8'))
vscodeSettingsJSON['json.schemas'] = schemas

await fs.writeFile(vscodeSettingsJSONFilename, format(JSON.stringify(vscodeSettingsJSON), { parser: 'json' }))

await exportJSONSchemaTask

console.log('Successfully export the JSON schemas.')
