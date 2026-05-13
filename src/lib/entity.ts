import MongoDB from 'mongodb'

import db from './db.js'

function queryFilter<T extends Entity.Object>(
    filter: MongoDB.Filter<T>
): MongoDB.Filter<T> {
    return Object.entries(filter)
        .reduce((o, [k, v]) => {
            if (v instanceof Entity) {
                Object.defineProperty(o, k, {
                    get value(): MongoDB.ObjectId {
                        return v._id
                    }
                })
            } else if (typeof v === `undefined`) {
                delete o[k]
            }
            return o
        }, Object.assign({}, filter))
}

function entityTimestamps<T extends Entity>(
    entity: T
): Omit<Entity.Object, '_id'> {
    return {
        _created: entity._created ?? new Date(),
        _updated: entity._created ? new Date() : null
    }
}

function entityData<T extends Entity>(
    entity: T
): T {
    const data = {
        ...entity,
        ...entityTimestamps(entity)
    }
    return Object.entries(data)
        .reduce((o, [k, v]) => {
            if (v instanceof Entity) {
                Object.defineProperty(o, k, {
                    get value(): MongoDB.ObjectId {
                        return v._id
                    },
                    enumerable: true
                })
            } else if (typeof v === `undefined`) {
                Object.defineProperty(o, k, {
                    get value(): null {
                        return null
                    },
                    enumerable: true
                })
            }
            return o
        }, data)
}

class Entity {

    public _id: MongoDB.ObjectId = new MongoDB.ObjectId()
    public _created: Date
    public _updated: Date | null

    public constructor(
        data?: object
    ) {
        if (data)
            Object.assign(this, data)
    }

    public get _collection(): string {
        return this.constructor.name.toLowerCase()
    }

    public load?(): Promise<this>

    public async remove(): Promise<void> {
        const o = await db
            .collection(this._collection)
            .deleteOne({
                _id: this._id
            })
        if (o.deletedCount !== 1)
            throw new Error(`${this._collection}, _id: ${this._id} delete failed!`)
    }

    public async save(): Promise<this> {
        const data = entityData(this)
        const o = await db
            .collection(this._collection)
            .updateOne({
                _id: this._id
            }, {
                $set: data
            }, {
                upsert: true
            })
        if (!(o.upsertedCount === 1 || o.modifiedCount === 1 || o.matchedCount === 1))
            throw new Error(`${this._collection}, _id: ${this._id} saved failed!`)
        this._created = data._created
        this._updated = data._updated
        return this
    }

    protected static async findMany<T extends Entity>(
        filter?: MongoDB.Filter<T>,
        options?: Entity.FindOptions<T>
    ): Promise<T[]> {
        const data = await db
            .collection<T>(this.name.toLowerCase())
            .find(queryFilter<T>(filter || {}), options)
            .toArray()
            .then(r => r.map(o => new this(o)))
        const entities = await Promise.all(
            data
                .map(o => o.load ? o.load() : o)
        )
        return entities as T[]
    }

    protected static async findOne<T extends Entity>(
        id: MongoDB.ObjectId | string
    ): Promise<T | null> {
        const _id = id instanceof MongoDB.ObjectId
            ? id
            : MongoDB.ObjectId.createFromHexString(id)
        const o = await db
            .collection(this.name.toLowerCase())
            .findOne({ _id })
        const entity = o
            ? new this(o) as T
            : null
        return entity
            ? (entity.load
                ? await entity.load()
                : entity
            )
            : null 
    }

    protected async relation<T extends Entity>(
        Relation: { new(o?: any): T },
        key?: keyof this
    ): Promise<T> {
        const collection = Relation.name.toLowerCase()
        const field = key ?? collection as keyof this
        const _id = this[field] instanceof MongoDB.ObjectId
            ? this[field]
            : null
        if (!_id)
            throw new Error(`${this._collection} ${field as string} is not a valid document _id!`)
        const o = await db
            .collection(collection)
            .findOne({ _id })
        if (!o)
            throw new Error(`Invalid ${collection} _id: ${_id}!`)
        const relation = new Relation(o)
        return relation.load
            ? relation.load()
            : relation
    }

}

namespace Entity {

    export interface Object {
        _id: MongoDB.ObjectId
        _created: Date
        _updated: Date | null
    }

    export interface FindOptions<T> extends MongoDB.FindOptions {
        sort: Sort<T>
    }

    export type Sort<T> = MongoDB.Sort & {
        [K in keyof T]?: MongoDB.SortDirection
    }

    export interface CreateIndexesOptions<T extends Entity> extends MongoDB.CreateIndexesOptions {
        partialFilterExpression?: {
            [K in keyof T]?: T[K]
        }
    } 

    export interface Index<T extends Entity> {
        fields: {
            [K in keyof T]?: MongoDB.IndexDirection
        },
        options: CreateIndexesOptions<T>
    }

    export async function createIndex<T extends Entity>(
        entity: { new(o: any): T },
        ...index: Entity.Index<T>[]
    ): Promise<void> {
        const collection = db.collection<T>(
            entity.name.toLowerCase()
        )
        const collections = await db.collections()
        if (!collections.find(o => o.collectionName === collection.collectionName))
            await db.createCollection(collection.collectionName)
        await dropIndexes(
            collection
        )
        await Promise.all(
            index
                //@ts-ignore
                .map(o => collection.createIndex(o.fields, o.options))
        )
    }

    async function dropIndexes<T extends Entity>(
        collection: MongoDB.Collection<T>
    ): Promise<void> {
        const indexes = (await collection.indexes())
            .filter(o => o.name !== `_id_`)
        await Promise.all(
            indexes.map(o => collection.dropIndex(o.name!))
        )
    }

}

export default Entity
