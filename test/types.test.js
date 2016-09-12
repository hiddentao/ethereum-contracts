"use strict";

const test = require('./_base')(module);


test.before = function*() {
  yield this.waitUntilNextBlock();  

  this.contract = new this.Contract({
    contract: this.Solidity.Types,
    web3: this.web3,
    account: this.web3.eth.coinbase,
    gas: 750000,
  });
  
  yield this.unlockAccount();
  this.contractInstance = yield this.contract.deploy();
}


test['int'] = {  
  big: function*() {
    try {
      this.contractInstance.localCall('set_int8', { val: Math.pow(2, 7) });
      throw -1;
    } catch (err) {
      err.message.should.contain('Value out of bounds');
    }
  },
  small: function*() {
    try {
      this.contractInstance.localCall('set_int8', { val: -Math.pow(2, 7) });
      throw -1;
    } catch (err) {
      err.message.should.contain('Value out of bounds');
    }    
  },
  NaN: function*() {
    try {
      this.contractInstance.localCall('set_int8', { val: 'abc' });
      throw -1;
    } catch (err) {
      err.message.should.contain('Value is not a number');
    }
  },
  ok: function*() {
    this.contractInstance.localCall('set_int8', { val: 123 }).should.eql(123);
  }
};


test['uint'] = { 
  big: function*() {
    try {
      this.contractInstance.localCall('set_uint8', { val: Math.pow(2, 8) });
      throw -1;
    } catch (err) {
      err.message.should.contain('Value out of bounds');
    }
  },
  small: function*() {
    try {
      this.contractInstance.localCall('set_uint8', { val: -1 });
      throw -1;
    } catch (err) {
      err.message.should.contain('Value out of bounds');
    }    
  },
  NaN: function*() {
    try {
      this.contractInstance.localCall('set_uint8', { val: 'abc' });
      throw -1;
    } catch (err) {
      err.message.should.contain('Value is not a number');
    }
  },
  ok: function*() {
    this.contractInstance.localCall('set_uint8', { val: 123 }).should.eql(123);
  }
};


test['bool'] = { 
  'empty string': function*() {
    this.contractInstance.localCall('set_bool', { val: '' }).should.eql(false);
  },
  '0 string': function*() {
    this.contractInstance.localCall('set_bool', { val: '0' }).should.eql(false);
  },
  'false string': function*() {
    this.contractInstance.localCall('set_bool', { val: 'false' }).should.eql(false);
  },
  'non-empty string': function*() {
    this.contractInstance.localCall('set_bool', { val: 'abc' }).should.eql(true);
  },
  '1 string': function*() {
    this.contractInstance.localCall('set_bool', { val: '1' }).should.eql(true);
  },
  'true string': function*() {
    this.contractInstance.localCall('set_bool', { val: 'true' }).should.eql(true);
  },
  'false': function*() {
    this.contractInstance.localCall('set_bool', { val: false }).should.eql(false);
  },
  'true': function*() {
    this.contractInstance.localCall('set_bool', { val: true }).should.eql(true);
  },
};


test['string'] = { 
  'number': function*() {
    this.contractInstance.localCall('set_string', { val: 123 }).should.eql('123');
  },
  'false': function*() {
    this.contractInstance.localCall('set_string', { val: false }).should.eql('false');
  },
  'abc': function*() {
    this.contractInstance.localCall('set_string', { val: 'abc' }).should.eql('abc');
  },
};


test['address'] = { 
  string: function*() {
    try {
      this.contractInstance.localCall('set_address', { val: 'abc' });
      throw -1;
    } catch (err) {
      err.message.should.contain('Value is not a valid address');
    }  
  },
  number: function*() {
    this.contractInstance.localCall('set_address', { val: 123 }).should.eql('0x000000000000000000000000000000000000007b');
  },
  address: function*() {
    this.contractInstance.localCall('set_address', { val: '0x1234567890123456789012345678901234567890' }).should.eql('0x1234567890123456789012345678901234567890');
  },
};


function trimStr(str) {
  return str.trim().replace(/\0/g, '');
}


test['bytes32 - fixed'] = { 
  number: function*() {
    let val = this.contractInstance.localCall('set_bytes32', { val: 123 });
    
    // TODO: not yet working!!!
    // this.web3.toDecimal(val).should.eql(123);
  },
  string: function*() {
    let val = this.contractInstance.localCall('set_bytes32', { val: 'abc' });
    
    trimStr(this.web3.toAscii(val)).should.eql('abc');
  },
  array: function*() {
    let val = this.contractInstance.localCall('set_bytes32', { val: [1,2] });
    
    JSON.parse(trimStr(this.web3.toAscii(val))).should.eql([1,2]);
  },
  object: function*() {
    let val = this.contractInstance.localCall('set_bytes32', { val: {a:'b'} });
    
    JSON.parse(trimStr(this.web3.toAscii(val))).should.eql({a:'b'});
  },
};

