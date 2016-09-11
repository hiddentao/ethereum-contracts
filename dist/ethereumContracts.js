(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['module'], factory);
  } else if (typeof exports !== "undefined") {
    factory(module);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod);
    global.EthereumContracts = mod.exports;
  }
})(this, function (module) {
  "use strict";

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
  };

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var DUMMY_LOGGER = {
    debug: function debug() {},
    info: function info() {},
    warn: function warn() {},
    error: function error() {}
  };

  /**
   * Factory for creating new contracts.
   */

  var ContractFactory = function () {
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
    function ContractFactory(config) {
      _classCallCheck(this, ContractFactory);

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


    _createClass(ContractFactory, [{
      key: 'make',
      value: function make(config) {
        return new Contract(Object.assign({}, config, {
          gas: this._gas,
          web3: this._web3,
          account: this._account
        }));
      }
    }]);

    return ContractFactory;
  }();

  var Contract = function () {
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
    function Contract(config) {
      _classCallCheck(this, Contract);

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


    _createClass(Contract, [{
      key: 'deploy',
      value: function deploy(args, options) {
        var _this = this;

        options = Object.assign({
          account: this._account,
          gas: this._gas
        }, options);

        this.logger.info('Deploy contract from account ' + options.account.address + '...');

        return this._unlockAccount(options.account).then(function () {
          var sortedArgs = _this._sanitizeMethodArgs('constructor', args);

          _this.logger.debug('Deploy contract ...');

          return new Promise(function (resolve, reject) {
            _this._contract.new.apply(_this._contract, sortedArgs.concat([{
              data: _this._bytecode,
              gas: options.gas,
              from: options.account.address
            }, function (err, newContract) {
              if (err) {
                _this.logger.error('Contract creation error', err);

                return reject(err);
              }

              if (!newContract.address) {
                _this.logger.debug('New contract transaction: ' + newContract.transactionHash);
              } else {
                _this.logger.info('New contract address: ' + newContract.address);

                resolve(new ContractInstance({
                  contract: _this,
                  address: newContract.address
                }));
              }
            }]));
          });
        });
      }
    }, {
      key: '_unlockAccount',
      value: function _unlockAccount(account) {
        var _this2 = this;

        return new Promise(function (resolve, reject) {
          _this2._web3.personal.unlockAccount(account.address, account.password, 2000, function (err) {
            if (err) {
              _this2.logger.info('Error unlocking account ' + account.address + ': ' + err.message);

              return reject(err);
            }

            _this2.logger.info('Unlocked account ' + account.address + ' for 2 seconds.');

            resolve();
          });
        });
      }
    }, {
      key: '_sanitizeMethodArgs',
      value: function _sanitizeMethodArgs(method, args) {
        var _this3 = this;

        args = args || {};

        this.logger.debug('Sanitize ' + Object.keys(args).length + ' arguments for method: ' + method + ' ...');

        var methodAbi = this._getMethodDescriptor(method);

        if (!methodAbi) {
          // if not constructor found then it's a built-in constructor
          if ('constructor' === method) {
            this.logger.debug('Built-in constructor, so no default arguments.');

            return [];
          } else {
            throw new Error('Method not found: ' + method);
          }
        }

        return methodAbi.inputs.map(function (input) {
          if (!args.hasOwnProperty(input.name)) {
            throw new Error('Missing argument ' + input.name + ' for method ' + method);
          }

          try {
            return _this3._convertInputArg(args[input.name], input.type);
          } catch (err) {
            throw new Error('Error converting value for argument ' + input.name + ' of method ' + method + ': ' + err.message);
          }
        });
      }
    }, {
      key: '_sanitizeMethodReturnValues',
      value: function _sanitizeMethodReturnValues(method, value) {
        var _this4 = this;

        var values = Array.isArray(value) ? value : [value];

        this.logger.debug('Sanitize ' + values.length + ' return values from method: ' + method + ' ...');

        var methodAbi = this._getMethodDescriptor(method);

        if (!methodAbi) {
          throw new Error('Method not found: ' + method);
        }

        var ret = methodAbi.outputs.map(function (output) {
          try {
            return _this4._convertReturnValue(values.shift(), output.type);
          } catch (err) {
            throw new Error('Error converting return value to type ' + output.name + ' for method ' + method + ': ' + err.message);
          }
        });

        return Array.isArray(value) ? ret : ret[0];
      }
    }, {
      key: '_getMethodDescriptor',
      value: function _getMethodDescriptor(method) {
        this.logger.debug('Get descriptor for method: ' + method + ' ...');

        var interfaceMethod = this._interface.find(function (item) {
          return item.name === method || item.type === method;
        });

        return interfaceMethod || null;
      }
    }, {
      key: '_convertReturnValue',
      value: function _convertReturnValue(value, targetType) {
        var originalType = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        this.logger.debug('Convert return value of type ' + originalType + ' to type ' + targetType + ' ...');

        // numbers
        if (0 === targetType.indexOf('int') || 0 === targetType.indexOf('uint')) {
          value = parseInt(this._web3.fromWei(value, 'wei'), 10);
        }

        return value;
      }
    }, {
      key: '_convertInputArg',
      value: function _convertInputArg(value, targetType) {
        var originalType = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        this.logger.debug('Convert input value of type ' + originalType + ' to type ' + targetType + ' ...');

        // numbers
        if (0 === targetType.indexOf('int') || 0 === targetType.indexOf('uint')) {
          var suffix = targetType.substr(targetType.indexOf('int') + 3);

          if (suffix.length) {
            suffix = parseInt(suffix, 10);
          } else {
            suffix = 256; // since int=int256 and uint=uint256
          }

          var maxValue = void 0,
              minValue = void 0;

          if (0 === targetType.indexOf('int')) {
            minValue = -(Math.pow(2, suffix - 1) - 1);
            maxValue = Math.pow(2, suffix - 1) - 1;
          } else {
            minValue = 0;
            maxValue = Math.pow(2, suffix) - 1;
          }

          value = Number(value);

          if (isNaN(value)) {
            throw new Error('Value is not a number');
          }

          if (value < minValue || value > maxValue) {
            throw new Error('Value out of bounds (min=' + minValue + ', max=' + maxValue + ')');
          }
        }
        // bool
        else if ('bool' === targetType) {
            value += '';
            value = '' === value || '0' === value || 'false' === value ? false : true;
          }
          // string
          else if ('string' === targetType) {
              value = '' + value;
            }
            // address
            else if ('address' === targetType) {
                if ('number' === originalType) {
                  value = ('0000000000000000000000000000000000000000' + value.toString(16)).slice(-40);
                  value = '0x' + value;
                } else {
                  value = value + '';
                }

                if (!this._web3.isAddress(value)) {
                  throw new Error('Value is not a valid address');
                }
              }
              // bytes
              else if (0 === targetType.indexOf('byte')) {
                  value = this._web3.toHex(value);
                }

        return value;
      }
    }, {
      key: 'logger',
      get: function get() {
        return this._logger;
      },
      set: function set(val) {
        this._logger = {};

        for (var key in DUMMY_LOGGER) {
          this._logger[key] = val && typeof val[key] === 'function' ? val[key].bind(val) : DUMMY_LOGGER[key];
        }
      }
    }]);

    return Contract;
  }();

  var ContractInstance = function () {
    /**
     * Construct a new instance.
     *
     * @param {Object} config Configuration.
     * @param {Contract} config.contract The contract instance.
     * @param {String} config.address Address on blockchain.
     */
    function ContractInstance(config) {
      _classCallCheck(this, ContractInstance);

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
      for (var logMethod in DUMMY_LOGGER) {
        this._logger[logMethod] = function (logMethod, self) {
          return function () {
            self.contract.logger[logMethod].apply(self.contract.logger, ['[' + self.address + ']: '].concat(Array.from(arguments)));
          };
        }(logMethod, this);
      }
    }

    /**
     * Get address of this instance.
     * @return {String}
     */


    _createClass(ContractInstance, [{
      key: 'localCall',
      value: function localCall(method, args) {
        this._logger.info('Local call ' + method + ' ...');

        var sortedArgs = this.contract._sanitizeMethodArgs(method, args);

        return this.contract._sanitizeMethodReturnValues(method, this._inst[method].call.apply(this._inst[method], sortedArgs));
      }
    }, {
      key: 'sendCall',
      value: function sendCall(method, args, options) {
        var _this5 = this;

        options = Object.assign({
          account: this.contract._account,
          gas: this.contract._gas
        }, options);

        this._logger.info('Call method ' + method + ' from account ' + options.account.address + '...');

        return this.contract._unlockAccount(options.account).then(function () {
          var sortedArgs = _this5.contract._sanitizeMethodArgs(method, args);

          _this5._logger.debug('Execute method ' + method + ' ...');

          return new Promise(function (resolve, reject) {
            _this5._contract[method].sendTransaction.apply(_this5._contract, sortedArgs.concat([{
              data: _this5._bytecode,
              gas: options.gas,
              from: options.account.address
            }, function (err, txHash) {
              if (err) {
                _this5._logger.error('Method call error', err);

                return reject(err);
              }

              _this5._logger.debug('Fetch receipt for method call transaction ' + txHash + ' ...');

              _this5._web3.eth.getTransactionReceipt(txHash, function (err, receipt) {
                if (err) {
                  _this5._logger.error('Transaction receipt error', err);

                  return reject(err);
                }

                resolve(receipt);
              });
            }]));
          });
        });
      }
    }, {
      key: 'address',
      get: function get() {
        return this._address;
      }
    }, {
      key: 'contract',
      get: function get() {
        return this._contract;
      }
    }]);

    return ContractInstance;
  }();

  module.exports = { ContractFactory: ContractFactory, Contract: Contract, ContractInstance: ContractInstance };
});
