"use strict";

const test = require('./_base')(module);


test['default'] = function*() {
  this.contractFactory = new this.ContractFactory({
    web3: this.web3,
    account: {
      address: this.web3.eth.coinbase,
      password: '1234',
    },
    gas: 500000,
  });
  
  this.contract = this.contractFactory.make({
    contract: this.Solidity.Local
  });
  
  yield this.waitUntilNextBlock();
  
  yield this.contract.deploy();
};

