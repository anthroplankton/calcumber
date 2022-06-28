if (process.env.CLIENTID === undefined) {
    throw new Error('There is no client id in environment.')
}
if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
export const clientId = process.env.CLIENTID
export const token = process.env.TOKEN
export const nodeEnv = process.env.NODE_ENV || 'development'
