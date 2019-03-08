const assert         = require('assert')
const sinon          = require('sinon')
const path           = require('path')
const fs             = require('fs')
const os             = require('os')
const nmodel         = require('nedb/lib/model')
const NedbAsyncStore = require('.')

describe('constructor & loadDatabase', () => {
    let tmpfile
    beforeEach(() => { tmpfile = tmpFilename() ; fs.writeFileSync(tmpfile, serializedData()) })
    afterEach(()  => { fs.existsSync(tmpfile) && fs.unlinkSync(tmpfile) })

    // ----------------------------------------------------

    it('should construct an in-memory DataStore successfully', () => {
        const store = new NedbAsyncStore()

        assert.ok(store)
        assert.ok(store.executor)
        assert.equal(store.filename, null)
        assert.equal(store.inMemoryOnly, true)
        assert.equal(store.autoload, false)
        assert.equal(store.timestampData, false)
    })

    it('should construct a persisted DataStore successfully with regular constructor', async () => {
        const store = new NedbAsyncStore({filename: tmpfile, autoload: false})

        assert.ok(store)
        assert.ok(store.executor)
        assert.equal(store.filename, tmpfile)
        assert.equal(store.inMemoryOnly, false)
        assert.equal(store.autoload, false)
        assert.equal(store.timestampData, false)
        assert.equal(store.indexes._id.tree.tree.data.length, 0)

        await store.loadDatabase()
        assert(store.indexes._id.tree.tree.data.length > 0)
    })

    it('should construct a persisted DataStore successfully with promisified static method', async () => {
        const store = await NedbAsyncStore.new({filename: tmpfile})

        assert.ok(store)
        assert.ok(store.executor)
        assert.equal(store.filename, tmpfile)
        assert.equal(store.inMemoryOnly, false)
        assert.equal(store.autoload, false)
        assert.equal(store.timestampData, false)
        assert.equal(store.indexes._id.tree.tree.data.length, 0)

        await store.loadDatabase()
        assert(store.indexes._id.tree.tree.data.length > 0)
    })

    it('should construct a persisted, autoloaded DataStore successfully with promisified static method', async () => {
        const store = await NedbAsyncStore.new({filename: tmpfile, autoload: true})

        assert.ok(store)
        assert.ok(store.executor)
        assert.equal(store.filename, tmpfile)
        assert.equal(store.inMemoryOnly, false)
        assert.equal(store.autoload, true)
        assert.equal(store.timestampData, false)
        assert(store.indexes._id.tree.tree.data.length > 0)
    })
})

describe('crud', () => {
    let store
    beforeEach(async () => { store = await createStore() })
    afterEach(()        => { deleteStore(store) ; sinon.restore() })

    // ----------------------------------------------------

    it('should count records successfully', async () => {
        assert(await store.count({}), 4)
        assert(await store.count({name: 'John'}), 1)
        assert(await store.count({age:   30}),    2)
    })

    it('should reject on failed count call', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.count({}), {name: 'custom error'})
    })

    it('should find records successfully', async () => {
        assert.deepEqual((await store.find({})).map(r => r.name), ['John', 'Mary', 'Emily', 'Peter'])
        assert.deepEqual((await store.find({age: 30})).map(r => r.name), ['Emily', 'Peter'])
        assert.deepEqual((await store.find({age: 30}, {name: 1})), [{_id: 3, name: 'Emily'}, {_id: 4, name: 'Peter'}])
    })

    it('should reject on failed find', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.find({}), {name: 'custom error'})
    })

    it('should "find one" record successfully', async () => {
        assert.deepEqual(await store.findOne({_id: 1}),            {_id: 1, name: 'John', age: 20, 'role': 'Developer'})
        assert.deepEqual(await store.findOne({name: 'Mary'}),      {_id: 2, name: 'Mary', age: 25, 'role': 'Project Manager'})
        assert.deepEqual(await store.findOne({_id: 3}, {name: 1}), {_id: 3, name: 'Emily'})
    })

    it('should reject on failed "find one"', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.findOne({_id: 1}), {name: 'custom error'})
    })

    it('should insert a record successfully', async () => {
        const initialCount = await store.count({})
        await store.insert({name: 'Ann', age: 28, role: 'Developer'})
        assert.equal(await store.count({}), initialCount + 1)
    })

    it('should reject on failed insertion', async () => {
        sinon.mock(nmodel).expects('checkObject').once().throws('custom error')
        await assert.rejects(store.insert({name: 'Ann', age: 28, role: 'Developer'}), {name: 'custom error'})
    })

    it('should update a record successfully', async () => {
        const initialCount = await store.count({})
        await store.update({name: 'John'}, {name: 'Ann', age: 28, role: 'Developer'})
        assert.equal(await store.count({}), initialCount)
        assert.equal(await store.count({name: 'John'}), 0)
        assert.equal(await store.count({name: 'Ann'}), 1)
    })

    it('should reject on failed update', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.update({_id: 1}, {name: 'Ann', age: 28, role: 'Developer'}), {name: 'custom error'})
    })

    it('should remove a record successfully', async () => {
        const initialCount = await store.count({})
        await store.remove({name: 'John'})
        assert.equal(await store.count({}), initialCount - 1)
        assert.equal(await store.count({name: 'John'}), 0)
    })

    it('should reject on failed remove', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.remove({_id: 1}), {name: 'custom error'})
    })

    it('should create & remove index successfully', async () => {
        assert.equal(store.indexes.name, undefined)
        await store.ensureIndex({fieldName: 'name'})
        assert.ok(store.indexes.name)
        await store.removeIndex('name')
        assert.equal(store.indexes.name, undefined)
    })

    it('should reject on failed index creation', async () => {
        await assert.rejects(store.ensureIndex({invalid: 'value'}), {message: 'Cannot create an index without a fieldName'})
    })

    it('should reject on failed index removal', async () => {
        sinon.mock(require('nedb/lib/storage')).expects('appendFile').once().callsArgWith(3, new Error('custom error'))
        await assert.rejects(store.removeIndex('invalid'), {message: 'custom error'})
    })
})

describe('cursor methods', () => {
    let store
    beforeEach(async () => { store = await createStore() })
    afterEach(()        => { deleteStore(store) ; sinon.restore() })

    // ----------------------------------------------------
    it('should find records with cursors successfully', async () => {
        assert.deepEqual(await store.cfind({}).projection({_id: 0, name: 1}).limit(1).exec(), [{name: 'John'}])
    })

    it('should reject on failed "find with cursor"', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.cfind({}).exec(), {name: 'custom error'})
    })

    it('should "find one" record with cursors successfully', async () => {
        assert.deepEqual(await store.cfindOne({age: 30}).projection({_id: 0, name: 1}).skip(1).exec(), {name: 'Peter'})
    })

    it('should reject on failed "find one with cursor"', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.cfindOne({}).exec(), {name: 'custom error'})
    })

    it('should count record with cursors successfully', async () => {
        assert.deepEqual(await store.ccount({age: { $gt: 10 } }).limit(2).exec(), 2)
    })

    it('should reject on failed "count with cursor"', async () => {
        sinon.mock(nmodel).expects('match').once().throws('custom error')
        await assert.rejects(store.ccount({}).exec(), {name: 'custom error'})
    })
})

describe('extended class', () => {
    let store
    beforeEach(async () => {
        store = await createStore(MyStore)
    })
    afterEach(() => {
        deleteStore(store)
        sinon.restore()
    })

    // -------------------------------------------------------------

    class MyStore extends NedbAsyncStore {
        constructor(...args) {
            super(...args)
        }

        async insert(attributes) {
            return await super.insert({...attributes, key: 'value'})
        }

        async findByName(name) {
            return await super.find({name})
        }
    }
    
    // -------------------------------------------------------------

    it('should insert record using overriden method', async () => {
        await store.insert({_id: 5, name: 'Ann', age: 28, role: 'Developer'})
        assert.deepEqual(await store.findOne({_id: 5}), {_id: 5, name: 'Ann', age: 28, role: 'Developer', key: 'value'})
    })

    it('should find records using custom finder', async () => {
        assert.deepEqual(await store.findByName('Emily'), [{_id: 3, name: 'Emily', age: 30, role: 'Developer'}])
    })

    it('should still call methods from parent class', async () => {
        assert.equal(await store.count({}), 4)
        await store.insert({_id: 5, name: 'Ann', age: 28, role: 'Developer'})
        assert.deepEqual((await store.find({})).map(x => x.name), ['John', 'Mary', 'Emily', 'Peter', 'Ann'])
        assert.deepEqual(await store.findOne({_id: 5}, {_id: 0, name: 1}), {name: 'Ann'})
        await store.update({_id: 5}, {$set: { age: 35 }})
        assert.deepEqual(await store.cfindOne({age: 35}).projection({_id: 0, name: 1}).exec(), {name: 'Ann'})
        await store.remove({_id: 5})
        assert.deepEqual(await store.cfind({name: 'Ann'}).exec(), [])
    })
})

function tmpFilename() {
    const randSuffix = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 6)
    return path.join(os.tmpdir(), '.nedb-model.test.' + randSuffix)
}

async function createStore(klass = NedbAsyncStore) {
    const tmpfile = tmpFilename()
    fs.writeFileSync(tmpfile, serializedData())
    return await klass.new({filename: tmpfile, autoload: true})
}

function deleteStore(store) {
    fs.existsSync(store.filename) && fs.unlinkSync(store.filename)
}

function serializedData() {
    return [
        {'_id': 1, 'name': 'John',  'age': 20, 'role': 'Developer'        },
        {'_id': 2, 'name': 'Mary',  'age': 25, 'role': 'Project Manager'  },
        {'_id': 3, 'name': 'Emily', 'age': 30, 'role': 'Developer'        },
        {'_id': 4, 'name': 'Peter', 'age': 30, 'role': 'Business Analyst' },
        undefined
    ].map(record => JSON.stringify(record)).join('\n')
}
