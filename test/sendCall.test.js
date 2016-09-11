"use strict";

const test = require('./_base')(module);


test.before = function*() {
  yield this.waitUntilNextBlock();  

  this.contract = new this.Contract({
    contract: this.Solidity.Mutate,
    web3: this.web3,
    account: {
      address: this.web3.eth.coinbase,
      password: '1234',
    },
    gas: 750000,
  });
  
  this.contractInstance = yield this.contract.deploy();
}


test['bad method'] = function*() {
  yield this.contractInstance.sendCall('invalid');
};
