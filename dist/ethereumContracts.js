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

              if (!contract.address) {
                _this.logger.debug('New contract transaction: ' + newContract.transactionHash);
              } else {
                _this.logger.info('New contract address: ' + newContract.address);

                resolve(newContract.address);
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
          _this2._web3.eth.personal.unlockAccount(account.address, account.password, 2000, function (err) {
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

        this.logger.debug('Sanitize ' + args.length + ' arguments for method: ' + method + ' ...');

        method = this._getMethodDescriptor(method);

        var ret = [];

        return method.inputs.map(function (input) {
          if (!args.hasOwnProperty(input.name)) {
            throw new Error('Missing argument ' + input.name + ' for method ' + method);
          }

          try {
            ret.push(_this3._convertValue(args[input.name], input.type));
          } catch (err) {
            throw new Error('Error converting value for argument ' + input.name + ' of method ' + method + ': ' + err.message);
          }
        });

        return ret;
      }
    }, {
      key: '_getMethodDescriptor',
      value: function _getMethodDescriptor(method) {
        this.logger.debug('Get descriptor for method: ' + method + ' ...');

        var interfaceMethod = this._interface.find(function (item) {
          return item.name === method || item.type === method;
        });

        if (!interfaceMethod) {
          throw new Error('Unable to find method ' + method);
        }

        return interfaceMethod;
      }
    }, {
      key: '_convertValue',
      value: function _convertValue(value, targetType) {
        var originalType = typeof value === 'undefined' ? 'undefined' : _typeof(value);

        this.logger.debug('Convert value of type ' + originalType + ' to type ' + targetType + ' ...');

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
        // boolean
        else if ('boolean' === targetType) {
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
                  value = '0x' + value.toString(16);
                } else {
                  value = value + '';
                }

                if (!this._web3.isAddress(value)) {
                  throw new Error('Value ' + value + ' is not a valid address');
                }
              }
              // byte array
              else if (0 === targetType.indexOf('byte')) {
                  if (!Array.isArray(value)) {
                    throw new Error('Value must be an array');
                  }

                  // fixed length
                  if ('bytes' !== targetType) {
                    // See http://solidity.readthedocs.io/en/latest/types.html#fixed-size-byte-arrays
                    if ('byte' === targetType) {
                      targetType = 'bytes1';
                    }

                    var maxLen = parseInt(targetType.substr(5), 10);

                    if (value.length > maxLen) {
                      throw new Error('Value length must not be greater than ' + maxLen);
                    }
                  }
                } else {
                  // pass through!
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

  module.exports = { Contract: Contract, ContractFactory: ContractFactory };
});

