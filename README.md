# ethereum-contracts

[![Build Status](https://secure.travis-ci.org/hiddentao/ethereum-contracts.png?branch=master)](http://travis-ci.org/hiddentao/ethereum-contracts) [![NPM module](https://badge.fury.io/js/ethereum-contracts.png)](https://badge.fury.io/js/ethereum-contracts) [![Twitter URL](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&label=Follow&maxAge=2592000)](https://twitter.com/hiddentao)

Ethereum contracts wrapper which makes it easier to deploy contracts to the 
blockchain and invoke their methods.

Features:

* Automatically type-casts method arguments and return values according to types in [contract ABI](https://github.com/ethereum/wiki/wiki/Solidity,-Docs-and-ABI).
* Auto-fetches transaction receipts for `sendTransaction` calls.
* `Promise`-ified asynchronous interface for easy use.
* Errors are gracefully handled
* Customizable logging, can be turned on/off at runtime
* Works with any [web3](https://github.com/ethereum/web3.js/) instance
* No dependencies - works in Node, Electron apps and browsers
* Automated [tests](https://travis-ci.org/hiddentao/ethereum-contracts)

## Installation

```shell
$ npm install ethereum-contracts
```

## Usage

Basic contract deployment:

```js
import Web3 from 'web3';
import solc from 'solc';
import { ContractFactory } from 'ethereum-contracts';

const web3 = new Web3(/* connect to running Geth node */);

// create a new factory
const factory = new ContractFactory({
  web3: web3,
  /* Account from which to make transactions */
  account: {
    address: web3.eth.coinbase,
    password: 'the account password' 
  },
  /* Default gas to use for any transaction */
  gas: 500000 
});

// compile our contract
const soliditySrc = readFile(...);
constant contractData = Object.values(solc.compile(soliditySrc, 1).contracts).pop();

// get Contract instance
const contract = factory.make({
  contract: contractData,
});

// Deploy it!
contract.deploy()
  .then((contractInstance) => {
    // deployed ok!
  })
  .catch(console.error);
```

The `deploy()` method returns a `Promise` which resolves to an instance of 
`ContractInstance` (`require('ethereum-contracts').ContractInstance`) 
representing an instance of the contract at its deployed address. 

This instance exposes an API which by which you can methods within the 
deployed contract.

### Invoking contract methods locally

Suppose we have a simple contract code:

```sol
contract Local {
  function getOne() returns (uint8, string) {
    return (123, "ok");
  }
}
```

We can call `getOne()` on the local blockchain without having to send out a 
transaction:

```js
console.log( contractInstance.localCall('getOne') );

/* [ 123, "ok" ] */
```

### Invoking contract methods via Transaction

Let's say our contract is:

```sol
contract Counter {
  uint8 val;
  
  function increment(){
    val += 1;
  }
}
```

We can invoke `increment()` by sending a transaction to the blockchain:

```js
contractInstance.sendCall('increment')
.then((txReceipt) => {
  // do something
})
.catch(console.error);
```

The `txReceipt` object returned above is the result of the call to 
`web3.eth.getTransactionReceipt()` for the corresponding transaction.

### Passing in method arguments

Let's say we our contract is:

```sol
contract Counter {
  uint8 val;
  string label;
  
  function increment(uint8 amount, string newLabel) {
    val += amount;
    label = newLabel;
  }
  
  function isBigger(uint8 check) returns (bool) {
    return (check > val) ? true : false;
  }
}
```

We can pass in arguments for both local calls and transaction calls as 
key-value pairs (i.e. `Object`):

```js
// local
let result = contractInstance.localCall('isBigger', {
  check: 5
})

// transaction
contractInstance.sendCall('increment', {
  amount: 10,
  newLabel: 'hello world'
});
```

### Override account and gas

Whether deploying a contract or calling a method via transaction, the gas value 
and  account from which the transaction is sent can be overridden on a per-call basis:

```js
import { Contract } from 'ethereum-contracts';

contract = new Contract({
  web3: web3,
  contract: contractData,
  account: {
    address: web3.eth.coinbase,
    password: 'password'
  },
  gas: 500000
})

contract.deploy({}, {
  /* override account */
  account: {
    address: '0xaa1a6e3e6ef20068f7f8d8c835d2d22fd5116444',
    password: '12345'
  }
})
.then((contractInstance) => {
  return contractInstance.sendCall('increment', {}, {
    /* override gas */
    gas: 100000
  });
})
```

### Browser usage

If you are not using a packaging manager and are instead importing [ethereumContracts.js](dist/ethereumContracts.js) directly then the class is exposed on the global object as `EthereumContracts`. Thus, in the browser window context you would use it like this:

```js
const contractFactory = new window.EthereumContracts.ContractFactory({
  web3: web3,
  account: {
    address: web3.eth.coinbase,
    password: 'the account password' 
  },
  gas: 500000
});
```

## Type conversions



When passing in method arguments the wrapper will try to type-cast each 
argument to the required target type as defined in the contract ABI.

Specifically, here is what it does for each type:

* `int/uint, int8/uint8, ..., int256/uint256` - input argument is converted to 
a number and then checked to ensure it is within the accepted range of numbers for the given type's boundaries.
*Note that `Date` instances get auto-converted to their millisecond representations.*
* `string` - input argument is converted to a string.
* `bool` - if input argument is `0, false, "false", or ""` it is passed on as 
`false` else it is passed on as `true`.
* `address` - if input argument is a number it is converted to a hex 
representation with enough padding to ensure it is a valid address. Otherwise it
is string-ified and checked using `web3.isAddress()`.
* `byte, bytes, bytes, ..., bytes32` - input argument is converted to hex 
using `web3.toHex()`.

For return values, the logic just ensures that `int/uint` values are returned 
as actual numbers and not `BigNumber` instances (as is usually returned by web3).

**Example**

Let's say our contructor has:

```sol
contract Test {
  constructor(uint256 val, bool flag, address addr) {}
}
```

If we deploy with the following arguments...

```js
this.contract.deploy({
  val: new Date(2016,0,1,5,30,22),
  flag: 'false',
  addr: 234234
});
```

...the actual values passed to the constructor will be:

```
(1451597422000, false, '0x00000000000000000000000000000000000392fa')
```





## Development

To build and run the tests:

```shell
$ npm install
$ npm test
```

To run tests with coverage:

```shell
$ npm run test-coverage
```


## Contributions

Contributions welcome - see [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT - see [LICENSE.md](LICENSE.md)

