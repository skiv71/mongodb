## @skivy71/mongodb

### Description

This is a small library inspired by [TypeORM](https://typeorm.io/docs/getting-started).

Like TypeORM, exports a base "Entity" class, however this library does so using the [Active Record](https://typeorm.io/docs/guides/active-record-data-mapper#what-is-the-active-record-pattern) format (which TypeORM does not).

### Usage

```TypeScript
import Entity from ".."

class MyClass extends Entity {

    // (optional) - omit to use *.save directly
    public async save(): Promise<this> {   
        await validateOrReject(this)
        return super.save()
    }

    // (optional) - omit to use *.remove directly
    public async remove(): Promise<void> { // omit to use entity.remove directly
        await super.remove()
    }

    // implement for MyClass.find({})
    public static find = Entity.findMany<MyClass>     

    // implement for MyClass.findById(<string | ObjectId>)
    public static findById = Entity.findOne<MyClass>  

}
```

### How it works at database level

Under the hood, the library creates mongodb ObjectId's automatically and applies timestamps automatically.

Any values which are non-enumerable will not be added the database.

In the case of "relations", the field e.g. group (Group Entity) will be replaced an <ObjectId> and should you wish to query an entity by relation, the relation (as an entity can be used in the query.)

e.g
```TypeScript
class User extends Entity {

    public group: Group

}

const [group] = await Group.find({ name })

if (!group)
    throw new Error("Oops, wrong name!")

const users = await User.find({ group })
```

### Loading relations

In the case of relations, these can be loaded automatically via the findOne / findMany.

The base Entity class looks for the *.load() function and calls it automatically, if present.

There is a special <protected> method available to quickly load any relation(s).

e.g.
```TypeScript
class User extends Entity {

    public group: Group
    
    public async load(): Promise<this> {
        this.group = await this.relation(Group)
        return this
    }

}

```

### Indexes
The base Entity class exposes the following static methods, which you can use to control any indexes

e.g.
```TypeScript
await Entity.createIndex(User, {
    fields: {
        email: 1,
        mobile: 1
    },
    options: {
        unique: true
    }
}, {
    fields: {
        role: 1
    },
    options: {
        unique: true,
        partialFilterExpression: {
            role: `admin`
        }
    }
})
```

### Validation

At this time, I'm currently using [class-validator](https://github.com/typestack/class-validator)

Please see "./src/app/*"

### Notes

This snippet is a WIP, but I use the same code for my personal projects.

### Build

You can run
```bash
npm run build
```
