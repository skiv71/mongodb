import {
    IsEmail,
    IsMobilePhone,
    IsIn,
    Min,
    validateOrReject
} from "class-validator"

import Entity from "../../lib/entity.js"

const USER = {
    ROLES: [
        `admin`,
        `user`
    ]
} as const

class User extends Entity implements User.Object {

    @IsIn(USER.ROLES)
    declare public role: User.Role

    @IsEmail()
    declare public email: string

    @IsMobilePhone(`en-GB`)
    declare public mobile: string

    @Min(0)
    declare public maxTrade: number

    constructor(
        user?: User.Object
    ) {
        super(user)
    }

    public async save(): Promise<this> {
        await validateOrReject(this)
        return super.save()
    }

    public async remove(): Promise<void> {
        await super.remove()
    }

    public static find = Entity.findMany<User>

    public static findById = Entity.findOne<User>

}

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

namespace User {

    export const ROLES = USER.ROLES

    export type Role = (typeof ROLES)[number]

    export interface Object {
        role: Role
        email: string
        maxTrade: number
        mobile: string
    }

}

export default User
