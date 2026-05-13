const config = {
    MONGO_DB: process.env.MONGO_DB || ``,
    MONGO_URI: process.env.MONGO_URI || ``
} as const

type Config = typeof config

function getConfig(): Config {
    for (const key of Object.keys(config) as (keyof Config)[]) {
        const value = config[key]
        if (!value)
            throw new Error(`Invalid ${key}: ${value}!`)

    }
    return config
}

export default getConfig()
