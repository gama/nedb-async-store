const NedbAsyncStore = require('nedb-async-store');

(async function () {
    const store = new NedbAsyncStore({filename: 'addresses.db', autoload: false})
    store.loadDatabase().then(() => console.log('address database loaded'))

    const addressAttrs = [
        {address: '123 MyStreet',    postalCode: 12345, city: 'MyCity',    country: 'MC'},
        {address: '978 OtherStreet', postalCode: 98765, city: 'OtherCity', country: 'OC'}
    ]
    store.insert(addressAttrs)
        .then(() => console.log('addresses inserted'))
        .catch((err) => console.error('Error inserting addresses: ', err))

    store.find({})
        .then((addresses) => console.log('Current addresses: ', addresses))

    // or, using ES7's async/await
    const address1 = await store.findOne({ postalCode: 98765 })
    console.log('Address1: ', address1)
    console.log('# of addresses: ', await store.count({}))
})()
