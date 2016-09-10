"use strict";

const test = require('./_base')(module);


test.before = function*() {
  yield this.waitUntilNextBlock();
}

test.beforeEach = function*() {
  this.payContract = new this.Contract({
    contract: this.Solidity.PayContract,
    web3: this.web3,
    account: {
      address: this.web3.eth.coinbase,
      password: '1234',
    },
    gas: 500000,
  });
};


test['default'] = function*() {  
  // this.payContract.logger = console;
  
  const dest = '0x2bd2326c993dfaef84f696526064ff22eba5b362';
  
  const deployedAddress = yield this.payContract.deploy({
    _fee: 5,
    _dest: dest,
    _str: 'test',
    _data: [1],
    _flag: false    
  });
  
  this.expect(deployedAddress).to.be.defined;
  
  const contract = yield this.loadContractAt(this.Solidity.PayContract, deployedAddress);
  
  contract.getDest.call().should.eql(dest);
};
