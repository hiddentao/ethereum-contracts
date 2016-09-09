(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["module"], factory);
  } else if (typeof exports !== "undefined") {
    factory(module);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod);
    global.EthereumContract = mod.exports;
  }
})(this, function (module) {
  "use strict";

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
    info: function info() {},
    warn: function warn() {},
    error: function error() {}
  };

  /**
   * A contract.
   */

  var Contract = function () {
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
    function Contract(config) {
      _classCallCheck(this, Contract);

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


    _createClass(Contract, [{
      key: "deploy",
      value: function deploy(options) {
        options = Object.assign({
          account: this._account
        }, options);
      }
    }, {
      key: "logger",
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

  module.exports = Contract;
});

