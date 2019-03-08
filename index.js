// adapted from https://github.com/jrop/nedb-promise
// Copyright (c) 2015, Jonathan Apodaca <jrapodaca@gmail.com>
// Copyright (c) 2019, Gustavo Gama <gustavo.gama@gmail.com>

const NedbDatastore = require('nedb')
const { promisify } = require('util')

class NedbAsyncStore extends NedbDatastore {
    constructor(options = {}) {
        super({...options, autoload: false})
        this.autoload = options.autoload || false
        if (this.autoload)
            this.loadDatabase().then(options.onload || ((err) => { if (err) throw err }))
    }

    static async new(options = {}) {
        return new Promise((resolve, reject) => {
            options.onload = options.autoload && ((err) => err ? reject(err) : resolve(instance))
            var instance = new this(options)
            if (!options.autoload)
                resolve(instance)
        })
    }

    cfind(query, projections) {
        const cursor = super.find(query, projections)
        cursor.exec  = promisify(cursor.exec.bind(cursor))
        return cursor
    }

    cfindOne(query, projections) {
        const cursor = super.findOne(query, projections)
        cursor.exec  = promisify(cursor.exec.bind(cursor))
        return cursor
    }

    ccount(query) {
        const cursor = super.count(query)
        cursor.exec  = promisify(cursor.exec.bind(cursor))
        return cursor
    }
}

const PROMISIFIABLE_METHODS = [
    'loadDatabase', 'insert', 'find', 'findOne', 'count', 'update',
    'remove', 'ensureIndex', 'removeIndex'
]
for (let method of PROMISIFIABLE_METHODS)
    NedbAsyncStore.prototype[method] = promisify(NedbDatastore.prototype[method])

module.exports = NedbAsyncStore
