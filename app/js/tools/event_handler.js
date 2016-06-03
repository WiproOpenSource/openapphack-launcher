'use strict';

/**
 * Module for binding to, and triggering of events
 *
 * TODO: investigate existing alternatives
 */
var event_handler = (function () {
  // private
  var handlers = [];

  // public
  return {
    /**
     * Tracks handler under module->event.
     * 
     * @param  {[type]} module  [description]
     * @param  {[type]} event   [description]
     * @param  {[type]} handler [description]
     * @return {[type]}         [description]
     */
    bind: function (module, event, handler) {
      if (!handlers[module]) {
        handlers[module] = [];
      }

      if (!handlers[module][event]) {
        handlers[module][event] = [];
      }

      handlers[module][event].push(handler);
    },

    /**
     * Triggers all handlers under module->event and passes them args.
     * @param  {[type]} module [description]
     * @param  {[type]} event  [description]
     * @param  {[type]} args   [description]
     * @return {[type]}        [description]
     */
    trigger: function (module, event, args) {
      if (!handlers[module] || !handlers[module][event]) {
        return;
      }

      handlers[module][event].forEach(function (handler) {
        handler.apply(handler, args);
      })
    }
  };
})();

module.exports = event_handler;