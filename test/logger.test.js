"use strict";

const test = require('./_base')(module);


test.before = function*() {
  this.contract = new this.Contract({
    contract: this.Solidity.Local,
    web3: this.web3,
    account: this.web3.eth.coinbase,
    gas: 500000,
  });
  
  yield this.waitUntilNextBlock();
};


test['nothing by default'] = function*() {
  let spy = this.mocker.spy(console, 'info');
  
  yield this.unlockAccount();
  yield this.contract.deploy();
  
  spy.should.not.have.been.called;
};


test['turn on and off'] = function*() {
  let spy = this.mocker.spy(console, 'info');
  
  this.contract.logger = {
    info: spy,
  };
  yield this.unlockAccount();
  yield this.contract.deploy();
  
  const callCount = spy.callCount;
  callCount.should.be.gt(0);
  
  this.contract.logger = null;

  yield this.unlockAccount();
  yield this.contract.deploy();
  
  spy.callCount.should.eql(callCount);
};



test['must be valid logger'] = function*() {
  let spy = this.mocker.spy();
  
  this.contract.logger = 'blah';
  
  this.contract.logger.info('test');

  spy.should.not.have.been.called;
};



