"use strict";

const test = require('./_base')(module);


test['default'] = function*() {
  this.contractFactory = new this.ContractFactory({
    web3: this.web3,
    account: this.web3.eth.coinbase,
    gas: 500000,
  });
  
  this.contract = this.contractFactory.make({
    contract: this.Solidity.Local
  });
  
  yield this.waitUntilNextBlock();
  
  yield this.unlockAccount();

  yield this.contract.deploy();
};

