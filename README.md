nedb-promise
============
Simple wrapper for NeDB's DataStore, providing easy class-based extensibility and a promisified API.

Inspired by [jrop's NeDB wrapper](https://github.com/jrop/nedb-promise).

Installation
============
Install with yarn:

`$ yarn install`


Usage
=====
Just create an instance of the `NedbAsyncStore` class as usual, and use the promisified `nedb` methods:
```javascript
const NedbAsyncStore = require('nedb-async-store');

(async function () {
  const store = new NedbAsyncStore({filename: 'addresses.db', autoload: false});
  store.loadDatabase().then(() => console.log('address database loaded'));

  const addressAttrs = [
    {address: '123 MyStreet',    postalCode: 12345, city: 'MyCity',    country: 'MC'},
    {address: '978 OtherStreet', postalCode: 98765, city: 'OtherCity', country: 'OC'}
  ];
  store.insert(addressAttrs)
    .then(() => console.log('addresses inserted'))
    .catch((err) => console.error('Error inserting addresses: ', err));

  store.find({})
    .then((addresses) => console.log('Current addresses: ', addresses));

  // or, using ES7's async/await
  const address1 = await store.findOne({ postalCode: 98765 });
  console.log('Address1: ', address1);
  console.log('# of addresses: ', await store.count({}));
})();
```

As in [nedb-promise](https://github.com/jrop/nedb-promise), the cursor API is
accessible through explicit methods (`cfind`, `cfindOne` and `ccount`):
```javascript
const numAddresses = await addressStore.ccount({postalCode: 12345}).exec();

const addresses = await addressStore.cfind({city: 'MyCity'})
  .limit(10)
  .projection({_id: 0, country: 1})
  .exec();
```

## Extending DataStores
Since `NedbAsyncStore` exposes a ES6-style class wrapper, one may easily extend
the basic features provided by the original NeDB `Datastore`:

```javascript
const NedbAsyncStore = require('nedb-async-store');

class UserStore extends NedbAsyncStore {
  // automatically encrypts the password attribute on document creation
  async insert(attrs) {
    return await super.insert({ ...attrs, password: encrypt(attrs.password) });
  }

  // custom finder
  async findByEmail(email) {
    return await super.find({email});
  }
}

(async function () {
  const Users = await UserStore.new({filename: 'users.db', autoload: true});

  await Users.insert({
    firstName: 'John',
    lastName:  'Doe',
    email:     'johndoe@example.com',
    password:  'correct horse battery staple'
  });

  console.log('John Doe: ', await Users.findByEmail('johndoe@example.com'));
})()
```


Testing
=======
Unit tests may be executed with yarn:

```bash
$ yarn test
```
