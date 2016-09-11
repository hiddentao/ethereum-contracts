"use strict";

const test = require('./_base')(module);


test.before = function*() {
  yield this.waitUntilNextBlock();  

  this.contract = new this.Contract({
    contract: this.Solidity.Local,
    web3: this.web3,
    account: {
      address: this.web3.eth.coinbase,
      password: '1234',
    },
    gas: 750000,
  });
  
  this.contractInstance = yield this.contract.deploy();
  // this.contract.logger = console;
}


test['bad method'] = function*() {
  try {
    this.contractInstance.localCall('invalid');
    throw -1;
  } catch (err) {
    err.message.should.contain('Method not found');
  }  
};


test['return values'] = {
  zero: function*()  {
    this.contractInstance.localCall('getZero').should.eql([]);
  },
  one: function*()  {
    this.contractInstance.localCall('getOne', { val: 123 }).should.eql(123);
  },
  two: function*() {
    this.contractInstance.localCall('getTwo', { 
      s: 'abc', 
      a: '0xaa1a6e3e6ef20068f7f8d8c835d2d22fd5116444' 
    }).should.eql([
      'abc', 
      '0xaa1a6e3e6ef20068f7f8d8c835d2d22fd5116444' 
    ]);
  }
}
