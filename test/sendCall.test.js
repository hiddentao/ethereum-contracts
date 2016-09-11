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
  try {
    yield this.contractInstance.sendCall('invalid');
    throw -1;
  } catch (err) {
    err.message.should.contain('Method not found');
  }
};



test['bad argument'] = function*() {
  try {
    yield this.contractInstance.sendCall('increment', {
      _amount: "haha"
    });
    throw -1;
  } catch (err) {
    err.message.should.contain('Value is not a number');
  }
};



test['good call'] = function*() {
  yield this.contractInstance.sendCall('increment', {
    _amount: 12
  });
};




