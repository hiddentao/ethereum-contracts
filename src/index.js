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
   * @param {Object} [args] Contract constructor parameters.
   * @param {Object} [options] Additional options.
   * @param {String} [options.account] Account to send transaction from. Overrides default set during construction.
   * @param {String} [options.account.address] Address of account.
   * @param {String} [options.account.password] Password for account.
   * @param {Number} [options.gas] Gas amount to use. Overrides default set during construction.
   *
   * @return {Promise} Resolves to `ContractInstance` object if successful.
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
            
            if (!newContract.address) {
              this.logger.debug(`New contract transaction: ${newContract.transactionHash}`);  
            } else {
              this.logger.info(`New contract address: ${newContract.address}`);  
              
              resolve(new ContractInstance({
                contract: this, 
                address: newContract.address
              }));
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
      this._web3.personal.unlockAccount(
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
    args = args || {};

    this.logger.debug(`Sanitize ${Object.keys(args).length} arguments for method: ${method} ...`);
    
    const methodAbi = this._getMethodDescriptor(method);
    
    if (!methodAbi) {
      // if not constructor found then it's a built-in constructor
      if ('constructor' === method) {
        this.logger.debug('Built-in constructor, so no default arguments.')
        
        return [];
      } else {
        throw new Error(`Method not found: ${method}`);
      }
    }
    
    return methodAbi.inputs.map((input) => {
      if (!args.hasOwnProperty(input.name)) {
        throw new Error(`Missing argument ${input.name} for method ${method}`);
      }
      
      try {
        return this._convertInputArg(args[input.name], input.type);
      } catch (err) {
        throw new Error(`Error converting value for argument ${input.name} of method ${method}: ${err.message}`);
      }
    });
  }
  
  
  
  /**
   * Sanitize return values from given contract method.
   *
   * @param {String} method The method name or type we wish to invoke.
   * @param {Array|*} value Return value or values from method call.
   *
   * @return {Array|*} Value or values matching method's declared return type.
   * @throws {Error} If sanitization fails.
   */
  _sanitizeMethodReturnValues (method, value) {   
    const values = (Array.isArray(value)) ? value : [value];
    
    this.logger.debug(`Sanitize ${values.length} return values from method: ${method} ...`);
    
    const methodAbi = this._getMethodDescriptor(method);
    
    if (!methodAbi) {
      throw new Error(`Method not found: ${method}`);
    }
    
    const ret = methodAbi.outputs.map((output) => {
      try {
        return this._convertReturnValue(values.shift(), output.type);
      } catch (err) {
        throw new Error(`Error converting return value to type ${output.name} for method ${method}: ${err.message}`);
      }
    });
    
    return Array.isArray(value) ? ret : ret[0];
  }
  
  
  
  /**
   * Get ABI descriptor for method from the contract interface.
   *
   * @param {String} method Method name or type.
   *
   * @return {Object} ABI if method found, `null` otherwise.
   */
  _getMethodDescriptor (method) {
    this.logger.debug(`Get descriptor for method: ${method} ...`);

    let interfaceMethod = this._interface.find((item) => {
      return item.name === method || item.type === method;
    });
    
    return interfaceMethod || null;
  }
  
  
  /**
   * Convert return value to one of the given output type
   *
   * @param {*} value The return value.
   * @param {String} targetType The return type.
   *
   * @return {*} Converted value.
   * @throws {Error} If conversion fails.
   */
  _convertReturnValue (value, targetType) {
    const originalType = typeof value;

    this.logger.debug(`Convert return value of type ${originalType} to type ${targetType} ...`);
    
    // numbers
    if (0 === targetType.indexOf('int') || 0 === targetType.indexOf('uint')) {
      value = parseInt(this._web3.fromWei(value, 'wei'), 10);
    }

    return value;    
  }
  
  
  
  /**
   * Convert a value to one of the given input type.
   *
   * @param {*} value The original value.
   * @param {String} targetType The target type.
   *
   * @return {*} Value of target type.
   * @throws {Error} If conversion fails.
   */
  _convertInputArg (value, targetType) {
    const originalType = typeof value;
    
    this.logger.debug(`Convert input value of type ${originalType} to type ${targetType} ...`);
    
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
    // bool
    else if ('bool' === targetType) {
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
        value = `0000000000000000000000000000000000000000${value.toString(16)}`.slice(-40);
        value = `0x${value}`;
      } else {
        value = value + '';
      }
      
      if (!this._web3.isAddress(value)) {
        throw new Error(`Value is not a valid address`);
      }
    }
    // bytes
    else if (0 === targetType.indexOf('byte')) {
      value = this._web3.toHex(value);
    }

    return value;
  }
}


/**
 * Instance of a `Contract` at a particular address.
 */
class ContractInstance {
  /**
   * Construct a new instance.
   *
   * @param {Object} config Configuration.
   * @param {Contract} config.contract The contract instance.
   * @param {String} config.address Address on blockchain.
   */
  constructor (config) {
    this._config = config;
    this._contract = config.contract;
    this._web3 = this._contract._web3;
    this._address = config.address;
    this._inst = this.contract._contract.at(this._address);
    
    /*
    Logger is same as parent contract one, except that address is prepended 
    to all log output.
     */
    this._logger = {};
    for (let logMethod in DUMMY_LOGGER) {
      this._logger[logMethod] = (function(logMethod, self) {
        return function() {
          self.contract.logger[logMethod].apply(
            self.contract.logger, 
            [`[${self.address}]: `].concat(Array.from(arguments))
          );
        };
      })(logMethod, this);
    }
  }
  
  /**
   * Get address of this instance.
   * @return {String}
   */
  get address () {
    return this._address;
  }
  
  /**
   * Get original contract object.
   * @return {Contract}
   */
  get contract () {
    return this._contract;
  }
  

  
  /**
   * Make a method call to the contract locally.
   *
   * @param {String} method Name of method to call.
   * @param {Object} args Method argument values.
   *
   * @return {*} Result of calling contract method.
   * @throws {Error} For any call errors.
   */
  localCall(method, args) {
    const parentContract = this.contract;

    this._logger.info(`Local call ${method} ...`);
    
    const sortedArgs = parentContract._sanitizeMethodArgs(method, args);

    return parentContract._sanitizeMethodReturnValues(
      method,
      this._inst[method].call.apply(this._inst[method], sortedArgs) 
    );
  }
  
  
  
  /**
   * Make a method call to the contract by creating a transaction on the blockchain.
   *
   * @param {String} method Name of method to call.
   * @param {Object} args Method argument values.
   * @param {Object} [args] Contract constructor parameters.
   * @param {Object} [options] Additional options.
   * @param {String} [options.account] Account to send transaction from. Overrides default set during construction.
   * @param {String} [options.account.address] Address of account.
   * @param {String} [options.account.password] Password for account.
   * @param {Number} [options.gas] Gas amount to use. Overrides default set during construction.
   *
   * @return {Promise} Resolves to transaction receipt.
   */
  sendCall (method, args, options) {    
    const parentContract = this.contract;
    
    options = Object.assign({
      account: parentContract._account,
      gas: parentContract._gas,
    }, options);
    
    this._logger.info(`Call method ${method} from account ${options.account.address}...`);

    return parentContract._unlockAccount(options.account)
    .then(() => {
      const sortedArgs = parentContract._sanitizeMethodArgs(method, args);

      this._logger.debug(`Execute method ${method} ...`);
            
      return new Promise((resolve, reject) => {
        this._inst[method].sendTransaction.apply(this._inst, sortedArgs.concat([
          {
            data: this._bytecode,
            gas: options.gas,
            from: options.account.address,
          },        
          (err, txHash) => {
            if (err) {
              this._logger.error('Method call error', err);
              
              return reject(err);
            }
            
            let tx = new Transaction({
              parent: this,
              hash: txHash
            });
            
            tx.getReceipt().then(resolve).catch(reject);
          }
        ]));
      });
    });
  }
}


/**
 * Represents an active transation on the blockchain.
 */
class Transaction {
  /**
   * Constructor a transaction object.
   *
   * @param {Object} config Configuration options.
   * @param {ContractInstance} config.parent The parent `ContratInstance`.
   * @param {String} config.hash Transaction hash.
   */
  constructor (config) {
    this._web3 = config.parent._web3;
    this._logger = config.parent._logger;
    this._hash = config.hash;
  }
  
  /**
   * Get transaction hash.
   * @return {String}
   */
  get hash () {
    return this._hash;
  }
  
  /**
   * Get receipt for this transaction.
   *
   * @return {Promise} resolves to receipt object.
   */
  getReceipt () {
    return new Promise((resolve, reject) => {
      this._fetchReceiptLoop(resolve, reject);
    });
  }

  
  /**
   * Fetch receipt for given transaction.
   *
   * This will execute in an asynchronous loop until either the receipt is 
   * available or the fetch gets cancelled.
   *
   * @param {Function} onSuccess Success callback. 
   * @param {Function} onError Error callback.
   */
  _fetchReceiptLoop (onSuccess, onError) {
    this._logger.debug(`Fetch receipt for tx ${this.hash} ...`);

    this._web3.eth.getTransactionReceipt(this.hash, (err, receipt) => {
      if (err) {
        this._logger.error('Transaction receipt error', err);
        
        return onError(err);
      }

      if (receipt) {
        onSuccess(receipt);
      } else {
        this._fetchReceiptLoopTimer = setTimeout(() => {
          this._fetchReceiptLoop(onSuccess, onError);
        }, 1000);
      }
    });
  }
}


module.exports = { ContractFactory, Contract, ContractInstance };
