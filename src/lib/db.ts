import { MongoClient } from "mongodb";

import config from "../config.js";

const client = new MongoClient(
    config.MONGO_URI
)

await client.connect()

export default client.db(config.MONGO_DB)
