"use strict";


const DUMMY_LOGGER = {
  debug: function() {},
  info: function() {},
  warn: function() {},
  error: function() {}
};


/**
 * Factory for creating new contracts.
 */
class ContractFactory {
  /**
   * Constuct a new instance.
   * 
   * @param {Object} config Configuration.
   * @param {Object} config.web3 A `Web3` instance.
   * @param {Object} config.account Account to send transactions from.
   * @param {String} config.account.address Address of account.
   * @param {String} config.account.password Password for account.
   * @param {Number} config.gas Gas amount to use for calls.
   */
  constructor (config) {
    this._config = config;
    this._web3 = config.web3;
    this._account = config.account;
    this._gas = config.gas;
  }
  
  /**
   * Make a wrapper for the given contract.
   *
   * @param {Object} config Configuration.
   * @param {Object} config.contract Contract data, usually the output of `solc` compiler.
   * @param {String} config.contract.interface Contract ABI interface JSON.
   * @param {String} config.contract.bytecode Contract bytecode string.
   */
  make (config) {
    return new Contract(Object.assign({}, config, {
      gas: this._gas,
      web3: this._web3,
      account: this._account,
    }));
  }
}



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
   * @param {String} config.contract.interface Contract ABI interface JSON.
   * @param {String} config.contract.bytecode Contract bytecode string.
   * @param {Object} config.account Account to send transactions from.
   * @param {String} config.account.address Address of account.
   * @param {String} config.account.password Password for account.
   * @param {Number} config.gas Gas amount to use for calls.
   */
  constructor (config) {
    this._config = config;
    this._web3 = config.web3;
    this._bytecode = config.contract.bytecode;
    this._interface = JSON.parse(config.contract.interface);
    this._contract = this._web3.eth.contract(this._interface);
    this._account = config.account;
    this._gas = config.gas;
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
   * @param {Object} args Contract constructor parameters.
   * @param {Object} [options] Additional options.
   * @param {String} [options.account] Account to send transaction from. Overrides default set during construction.
   * @param {String} [options.account.address] Address of account.
   * @param {String} [options.account.password] Password for account.
   * @param {Number} [options.gas] Gas amount to use. Overrides default set during construction.
   *
   * @return {Promise} Resolves to deployed contract address if successful.
   */
  deploy (args, options) {
    options = Object.assign({
      account: this._account,
      gas: this._gas,
    }, options);
    
    this.logger.info(`Deploy contract from account ${options.account.address}...`);

    return this._unlockAccount(options.account)
    .then(() => {
      const sortedArgs = this._sanitizeMethodArgs('constructor', args);

      this.logger.debug(`Deploy contract ...`);
            
      return new Promise((resolve, reject) => {
        this._contract.new.apply(this._contract, sortedArgs.concat([
          {
            data: this._bytecode,
            gas: options.gas,
            from: options.account.address,
          },        
          (err, newContract) => {
            if (err) {
              this.logger.error('Contract creation error', err);
              
              return reject(err);
            }
            
            if (!contract.address) {
              this.logger.debug(`New contract transaction: ${newContract.transactionHash}`);  
            } else {
              this.logger.info(`New contract address: ${newContract.address}`);  
              
              resolve(newContract.address);
            }
          }
        ]));
      });
    });
  }
  
  /**
   * Unlock given account.
   *
   * @param {Object} account Account details.
   * @param {String} account.address Account address.
   * @param {String} account.password Account passwrd.
   *
   * @return {Promise}
   */
  _unlockAccount (account) {
    return new Promise((resolve, reject) => {
      this._web3.eth.personal.unlockAccount(
        account.address, account.password, 2000, (err) => {
          if (err) {
            this.logger.info(`Error unlocking account ${account.address}: ${err.message}`);
            
            return reject(err);
          }
          
          this.logger.info(`Unlocked account ${account.address} for 2 seconds.`);
          
          resolve();
        }
      );
    });
  }
  
  
  /**
   * Sanitize arguments for given contract method.
   *
   * @param {String} method The method name or type we wish to invoke.
   * @param {Object} args Arguments for method.
   *
   * @return {Array}
   * @throws {Error} If sanitization fails.
   */
  _sanitizeMethodArgs (method, args) {   
    this.logger.debug(`Sanitize ${args.length} arguments for method: ${method} ...`);
    
    method = this._getMethodDescriptor(method);
    
    let ret = [];
    
    return method.inputs.map((input) => {
      if (!args.hasOwnProperty(input.name)) {
        throw new Error(`Missing argument ${input.name} for method ${method}`);
      }
      
      try {
        ret.push(this._convertValue(args[input.name], input.type));
      } catch (err) {
        throw new Error(`Error converting value for argument ${input.name} of method ${method}: ${err.message}`);
      }
    });
    
    return ret;
  }
  
  
  /**
   * Get ABI descriptor for method from the contract interface.
   *
   * @param {String} method Method name or type.
   *
   * @return {Object} ABI.
   * @throws {Error} If method not found.
   */
  _getMethodDescriptor (method) {
    this.logger.debug(`Get descriptor for method: ${method} ...`);

    let interfaceMethod = this._interface.find((item) => {
      return item.name === method || item.type === method;
    });
    
    if (!interfaceMethod) {
      throw new Error(`Unable to find method ${method}`);
    }    
    
    return interfaceMethod;
  }
  
  
  /**
   * Convert a value to one of the given type.
   *
   * @param {*} value The original value.
   * @param {String} targetType The target type.
   *
   * @return {*} Value of target type.
   * @throws {Error} If conversion fails.
   */
  _convertValue (value, targetType) {
    const originalType = typeof value;
    
    this.logger.debug(`Convert value of type ${originalType} to type ${targetType} ...`);
    
    // numbers
    if (0 === targetType.indexOf('int') || 0 === targetType.indexOf('uint')) {
      let suffix = targetType.substr(targetType.indexOf('int') + 3);
      
      if (suffix.length) {
        suffix = parseInt(suffix, 10);
      } else {
        suffix = 256; // since int=int256 and uint=uint256
      }
      
      let maxValue, minValue;
      
      if (0 === targetType.indexOf('int')) {
        minValue = -(Math.pow(2, (suffix-1))-1);
        maxValue = Math.pow(2, (suffix-1))-1;
      } else {
        minValue = 0;
        maxValue = Math.pow(2, suffix)-1;
      }
      
      value = Number(value);
      
      if (isNaN(value)) {
        throw new Error(`Value is not a number`);        
      }
      
      if (value < minValue || value > maxValue) {
        throw new Error(`Value out of bounds (min=${minValue}, max=${maxValue})`);
      }
    }
    // boolean
    else if ('boolean' === targetType) {
      value += '';
      value = ('' === value || '0' === value || 'false' === value) ? false : true;
    }
    // string
    else if ('string' === targetType) {
      value = '' + value;
    }
    // address
    else if ('address' === targetType) {
      if ('number' === originalType) {
        value = `0x${value.toString(16)}`;
      } else {
        value = value + '';
      }
      
      if (!this._web3.isAddress(value)) {
        throw new Error(`Value ${value} is not a valid address`);
      }
    }
    // byte array
    else if (0 === targetType.indexOf('byte')) {
      if (!Array.isArray(value)) {
        throw new Error(`Value must be an array`);
      }
      
      // fixed length
      if ('bytes' !== targetType) {
        // See http://solidity.readthedocs.io/en/latest/types.html#fixed-size-byte-arrays
        if ('byte' === targetType) {
          targetType = 'bytes1';
        }
        
        let maxLen = parseInt(targetType.substr(5), 10);
        
        if (value.length > maxLen) {
          throw new Error(`Value length must not be greater than ${maxLen}`);
        }
      }
    } else {
      // pass through!
    }

    return value;
  }
}


module.exports = { Contract, ContractFactory };
