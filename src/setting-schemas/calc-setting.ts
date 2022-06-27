import { JSONSchemaType } from 'ajv'

interface Setting {
    readonly 'lru-cache-max': number
}
export default Setting

export const schema: JSONSchemaType<Setting> = {
    description: 'Set the command "calc".',
    type: 'object',
    required: ['lru-cache-max'],
    properties: {
        'lru-cache-max': {
            description: 'The maximum number of the cached calculators.',
            type: 'integer',
            minimum: 0,
        },
    },
}
