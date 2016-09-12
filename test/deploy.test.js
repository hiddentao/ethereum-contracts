"use strict";

const test = require('./_base')(module);


test.before = function*() {
  this.payContract = new this.Contract({
    contract: this.Solidity.Pay,
    web3: this.web3,
    account: this.web3.eth.coinbase,
    gas: 500000,
  });
}


test['account locked'] = function*() {
  const dest = '0x2bd2326c993dfaef84f696526064ff22eba5b362';

  try {
    yield this.payContract.deploy({
      _fee: 5,
      _dest: dest,
      _str: 'test',
      _data: [1],
      _flag: false    
    });
    
    throw -1;
  } catch (err) {
    err.message.should.contain('account is locked');
  }
}


test['balance too low'] = function*() {
  const dest = '0x2bd2326c993dfaef84f696526064ff22eba5b362';

  try {
    yield this.unlockAccount();
    
    yield this.payContract.deploy({
      _fee: 5,
      _dest: dest,
      _str: 'test',
      _data: [1],
      _flag: false    
    });
    
    throw -1;
  } catch (err) {
    err.message.should.contain('balance too low');
  }
}


test['balance enough'] = {
  before: function*() {
    yield this.waitUntilNextBlock();
  },
  'deploy and get contract instance': function*() {  
    // this.payContract.logger = console;
    
    const dest = '0x2bd2326c993dfaef84f696526064ff22eba5b362';
    
    yield this.unlockAccount();

    const contractInstance = yield this.payContract.deploy({
      _fee: 5,
      _dest: dest,
      _str: 'test',
      _data: [1],
      _flag: false    
    });
    
    this.expect(contractInstance).to.be.instanceof(this.ContractInstance);
    
    const contract = yield this.loadContractAt(this.Solidity.Pay, contractInstance.address);
    
    contract.getDest.call().should.eql(dest);
    contractInstance.localCall('getDest').should.eql(dest);
  },
  'low gas': function*() {  
    // this.payContract.logger = console;
    
    const dest = '0x2bd2326c993dfaef84f696526064ff22eba5b362';
    
    try {
      yield this.unlockAccount();

      yield this.payContract.deploy({
        _fee: 5,
        _dest: dest,
        _str: 'test',
        _data: [1],
        _flag: false    
      }, {
        gas: 100
      });

      throw -1;
    } catch (err) {
      err.message.should.contain('gas too low');
    }
  },
  'bad account': function*() {  
    // this.payContract.logger = console;
    
    const dest = '0x2bd2326c993dfaef84f696526064ff22eba5b362';
    
    try {
      yield this.unlockAccount();

      yield this.payContract.deploy({
        _fee: 5,
        _dest: dest,
        _str: 'test',
        _data: [1],
        _flag: false    
      }, {
        account: '0x9560E8AC6718A6a1CdcfF189d603c9063E413dA6',
      });

      throw -1;
    } catch (err) {
      err.message.should.contain('account is locked');
    }
  },
}

