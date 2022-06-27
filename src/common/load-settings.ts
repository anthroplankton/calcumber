import type CalcSetting from '../setting-schemas/calc-setting'

import fs from 'fs/promises'
import path from 'path/posix'
import { inspect } from 'util'
import Ajv, { ValidateFunction } from 'ajv'
import { paramCase } from 'change-case'

/* Ajv 8.6.0 makes VSCode IntelliSense extremely slow
 * https://github.com/ajv-validator/ajv/issues/1667
 */
/* Semantic highlighting (encodedSemanticClassifications-full) extremely slow
 * https://github.com/microsoft/TypeScript/issues/44851
 */
/* JSONSchemaType incorrectly requires optional properties to be nullable
 * https://github.com/ajv-validator/ajv/issues/1664
 */
/* JSONSchemaType change nullable to be for nulls not undefined
 * https://github.com/ajv-validator/ajv/pull/1701
 */
const ajv = new Ajv()

interface Settings {
    calcSetting: CalcSetting
}
const settings: Partial<Settings> = {}

export type SettingName = typeof settingNames[number]
export const settingNames = ['calcSetting'] as const

type SettingKeysContainsSettingNames = SettingName extends keyof Settings ? true : false
type SettingNamesContainsSettingKeys = keyof Settings extends SettingName ? true : false
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const checking: SettingNamesContainsSettingKeys & SettingKeysContainsSettingNames = true

const validates: { [K in SettingName]?: ValidateFunction<Settings[K]> } = {}

export function getFilename(settingName: SettingName) {
    return path.format({
        dir: './settings',
        name: paramCase(settingName),
        ext: '.json',
    })
}

export async function importSettingSchema(settingName: SettingName) {
    return await import(
        path.format({
            dir: '../setting-schemas',
            name: paramCase(settingName),
            ext: '.js',
        })
    )
}

export async function reloadJSON<K extends SettingName>(settingName: K) {
    const [json, validate] = await Promise.all([
        (async () => {
            const file = await fs.readFile(getFilename(settingName), 'utf8')
            return JSON.parse(file)
        })(),
        (async () => {
            if (validates[settingName] === undefined) {
                const { schema } = await importSettingSchema(settingName)
                validates[settingName] = ajv.compile(schema) as Required<typeof validates>[K]
            }
            return validates[settingName] as Required<typeof validates>[K]
        })(),
    ])
    if (!validate(json)) {
        throw new Error(`Failed to validate the JSON of the setting "${settingName}" ${inspect(validate.errors)}`)
    }
    settings[settingName] = json as Settings[K]
    return json as Settings[K]
}

export async function loadSettings<K extends SettingName>(...settingNames: K[]) {
    for (const settingName of settingNames) {
        if (settings[settingName] === undefined) {
            await reloadJSON(settingName)
        }
    }
    return settings as Readonly<Pick<Settings, K>>
}
