const assert         = require('assert')
const NedbAsyncStore = require('nedb-async-store')

class UserStore extends NedbAsyncStore {
    // automatically encrypts the password attribute on document creation
    async insert(attrs) {
        return await super.insert({...attrs, password: encrypt(attrs.password)})
    }

    async loadDatabase({verbose=false, truncate=false}) {
        await super.loadDatabase()
        if (truncate)
            await this.remove({}, {multi: true})
        verbose && console.log(`UserStore loaded (#users: ${await this.count({})})`)
    }

    async authenticate(email, password) {
        const user = await this.findByEmail(email)
        assert(user, `User not found: ${email}`)
        assert(user.password === encrypt(password), `Invalid email or password (email: ${email}, password: ${password})`)
        return user
    }

    // custom finder
    async findByEmail(email) {
        return await super.findOne({email})
    }
}

// never do this for real! please use crypto-js
function encrypt(password) {
    const rot13 = (char) => String.fromCharCode((char <= 'Z' ? 90 : 122) >= (char = char.charCodeAt(0) + 13) ? char : char - 26)
    const rot5  = (char) => String.fromCharCode(57 >= (char = char.charCodeAt(0) + 5) ? char : char - 10)
    return password.replace(/[A-Za-z]/g, rot13).replace(/0-9/g, rot5)
}

(async function () {
    const Users = await UserStore.new({filename: 'users.db'})
    await Users.loadDatabase({verbose: true, truncate: true})

    await Users.insert({
        firstName: 'John',
        lastName:  'Doe',
        email:     'johndoe@example.com',
        password:  'correct horse battery staple'
    })

    const user = await Users.authenticate('johndoe@example.com', 'correct horse battery staple')
    console.log('Authenticated user:', user.email)
    try {
        await Users.authenticate('johndoe@example.com', 'wrong password')
    } catch (error) {
        console.error('Authentication failure:', error.message)
    }
})()
