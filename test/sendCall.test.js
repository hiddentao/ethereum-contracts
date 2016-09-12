"use strict";

const test = require('./_base')(module);


test.before = function*() {
  yield this.waitUntilNextBlock();  

  this.contract = new this.Contract({
    contract: this.Solidity.Mutate,
    web3: this.web3,
    account: this.web3.eth.coinbase,
    gas: 750000,
  });
  
  yield this.unlockAccount();
  this.contractInstance = yield this.contract.deploy();
}


test['bad method'] = function*() {
  try {
    yield this.unlockAccount();
    yield this.contractInstance.sendCall('invalid');
    throw -1;
  } catch (err) {
    err.message.should.contain('Method not found');
  }
};



test['bad argument'] = function*() {
  try {
    yield this.unlockAccount();
    yield this.contractInstance.sendCall('increment', {
      _amount: "haha"
    });
    throw -1;
  } catch (err) {
    err.message.should.contain('Value is not a number');
  }
};



test['good call'] = function*() {
  yield this.unlockAccount();
  let tx = yield this.contractInstance.sendCall('increment', {
    _amount: 12
  });
  
  tx.should.be.defined;
  tx.blockNumber.should.be.gt(0);
};



test['not enough gas'] = function*() {
  try {
    yield this.unlockAccount();
    yield this.contractInstance.sendCall('increment', {
      _amount: 12
    }, {
      gas: 100
    });
    
    throw -1;    
  } catch (err) {
    err.message.should.contain('gas too low');
  }
};




test['bad account'] = function*() {
  try {
    yield this.unlockAccount();
    
    yield this.contractInstance.sendCall('increment', {
      _amount: 12
    }, {
      account: '0x9560E8AC6718A6a1CdcfF189d603c9063E413dA6',
    });
    
    throw -1;    
  } catch (err) {
    err.message.should.contain('account is locked');
  }
};



