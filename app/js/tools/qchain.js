'use strict';

/**
 * A wrapper for npm Q module. Makes simple things simpler.
 */
var qchain = (function () {
  // private
  var Q = require('q');
  var promise_links = [];

  // public
  return {
    add: function (link) {
      promise_links.push(link);
    },

    defer: function () {
      return Q.defer();
    },

    // executes all promises non-sequentially
    all: function () {
      return Q.all(promise_links.map(function (link) {
        return link();
      }));
    },

    // executes all promises sequentially, in the order they were added
    chain: function () {
      var promise_chain = Q.fcall(function(){});

      promise_links.forEach(function(link) {
        promise_chain = promise_chain.then(link);
      });

      return promise_chain;
    }
  };
})();

module.exports = qchain;