import User from "./entity/user.js";

const user = new User({
    email: `skivy71@gmail.com`,
    role: `user`,
    maxTrade: 0,
    mobile: `+4471234567890`
})

// await user.save()
