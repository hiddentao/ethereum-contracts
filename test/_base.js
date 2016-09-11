"use strict";

// ensure we're in testing mode
process.env.NODE_ENV = 'test';

require('co-mocha'); // monkey-patch mocha

const _ = require('lodash'),
  path = require('path'),
  fs = require('fs'),
  Q = require('bluebird'),
  solc = require('solc'),
  shell = require('shelljs'),
  genomatic = require('genomatic'),
  geth = require('geth-private'),
  chai = require('chai'),
  sinon = require('sinon'),
  Web3 = require('web3');
  

chai.use(require('sinon-chai'));

// pkg
const EthereumContracts = require(path.join(__dirname, '..', 'dist', 'ethereumContracts.js')),
  Contract = EthereumContracts.Contract,
  ContractInstance = EthereumContracts.ContractInstance,
  ContractFactory = EthereumContracts.ContractFactory;

// contracts
const solidityFiles = shell.find(path.join(__dirname, 'contracts')).filter((file) => file.match(/\.sol$/));

const soliditySources = 
  solidityFiles.map((file) => [ path.basename(file, '.sol'), fs.readFileSync(file, 'utf8').toString() ]);

const solidityCompiled = solc.compile({ sources: _.fromPairs(soliditySources) }, 1);

if (!solidityCompiled.contracts) {
  console.error(solidityCompiled);
  
  throw new Error('Contract compilation error');
}

module.exports = function(_module) {
  const tools = {};

  tools.startGeth = function*(options) {
    this.geth = geth(Object.assign({
      gethOptions: {
        rpcport: 38545,
        port: 21313
      },
    }, options));
    
    yield this.geth.start();
    
    this.web3 = new Web3(
      new Web3.providers.HttpProvider('http://localhost:38545')
    );
  };

  tools.stopGeth = function*() {
    if (this.geth) {
      yield this.geth.stop();
      this.geth = null;
    }
  };

  tools.gethExec = function*(cmd) {
    console.log(`geth exec: ${cmd}`);

    yield this.geth.consoleExec(cmd);
  };

  tools.getBlock = function*(blockIdOrNumber) {
    console.log(`web3.eth.getBlock: ${blockIdOrNumber}`);
    
    return yield new Q((resolve, reject) => {
      this.web3.eth.getBlock(blockIdOrNumber, (err, block) => {
        if (err) {
          reject(err);
        } else {
          resolve(block);
        }
      });
    });
  };
  
  
  tools.loadContractAt = function*(contractData, address) {
    return this.web3.eth.contract(JSON.parse(contractData.interface)).at(address);
  };
  
  tools.waitUntilNextBlock = function*() {
    const blockNum = this.web3.eth.blockNumber;
    
    return yield new Q((resolve) => {
      const _waitIntervalTimer = setInterval(() => {
        const latestBlockNum = this.web3.eth.blockNumber;
        
        if (latestBlockNum !== blockNum) {
          clearInterval(_waitIntervalTimer);
          
          console.log(`Latest block number: ${latestBlockNum}`);

          resolve(latestBlockNum);
        }
      }, 100);
    });
  };

  tools.startMining = function*() {
    yield this.gethExec('miner.start();');
  }

  tools.stopMining = function*() {
    yield this.gethExec('miner.stop();');
    
    console.log(`Last block mined: ${this.web3.eth.blockNumber}`);
  }
  
  const test = {
    before: function*() {
      this.assert = chai.assert;
      this.expect = chai.expect;
      this.should = chai.should();
      
      this.Contract = Contract;
      this.ContractFactory = ContractFactory;
      this.ContractInstance = ContractInstance;
      this.Solidity = solidityCompiled.contracts;

      for (let k in tools) {
        this[k] = genomatic.bind(tools[k], this);
      }
      
      yield this.startGeth();
      yield this.startMining();      
    },
    after: function*() {
      yield this.stopGeth();
    },
    beforeEach: function*() {
      this.mocker = sinon.sandbox.create();      
    },
    afterEach: function*() {
      this.mocker.restore();
    },
    tests: {},
  };

  _module.exports[path.basename(_module.filename)] = test;

  return test.tests;
};
