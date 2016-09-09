"use strict";


const DUMMY_LOGGER = {
  info: function() {},
  warn: function() {},
  error: function() {}
};


/**
 * A contract.
 */
class Contract {
  /**
   * Constuct a new instance.
   * 
   * @param {Object} config Configuration.
   * @param {Object} config.web3 A `Web3` instance.
   * @param {Object} contract.contract Contract data, usually the output of `solc` compiler.
   * @param {Object} config.contract.interface Contract ABI interface JSON.
   * @param {String} config.contract.bytecode Contract bytecode string.
   * @param {String} config.contract.bytecode Contract bytecode string.
   * @param {Object} config.account Account to send transactions from.
   * @param {String} config.account.address Address of account.
   * @param {String} config.account.password Password for account.
   */
  constructor (config) {
    this._config = config;
    this._web3 = config.web3;
    this._contract = config.contract;
    this._account = config.account;
    this._logger = DUMMY_LOGGER;
  }

  /**
   * Get the logger.
   * @return {Object}
   */
  get logger () {
    return this._logger;
  }
  /**
   * Set the logger.
   * @param {Object} val Should have same methods as global `console` object.
   */
  set logger (val) {
    this._logger = {};
    
    for (let key in DUMMY_LOGGER) {
      this._logger[key] = (val && typeof val[key] === 'function') 
        ? val[key].bind(val)
        : DUMMY_LOGGER[key]
      ;
    }
  }
  
  
  /**
   * Deploy the contract to the blockchain.
   *
   * @param {Object} [options] Additional options.
   * @param {String} [options.account] Account to send transaction from. Overrides default set during construction.
   * @param {String} [options.account.address] Address of account.
   * @param {String} [options.account.password] Password for account.
   */
  deploy (options) {
    options = Object.assign({
      account: this._account,
    }, options);
    
    
  }
  
}


module.exports = Contract;
