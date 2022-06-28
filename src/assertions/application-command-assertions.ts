import { s } from '@sapphire/shapeshift'

/**
 * @see https://discord.com/developers/docs/interactions/application-commands#registering-a-command
 */
export function validateChatInputCommandAmount(amount: number) {
    return s.number.lessThanOrEqual(100).parse(amount)
}

/**
 * @see https://discord.com/developers/docs/interactions/application-commands#registering-a-command
 */
export function validateUserCommandAmount(amount: number) {
    return s.number.lessThanOrEqual(5).parse(amount)
}

/**
 * @see https://discord.com/developers/docs/interactions/application-commands#registering-a-command
 */
export function validateMessageCommandAmount(amount: number) {
    return s.number.lessThanOrEqual(5).parse(amount)
}
