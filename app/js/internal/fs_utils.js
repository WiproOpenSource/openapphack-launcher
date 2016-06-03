"use strict";

/**
 * Custom FS helpers.
 */
var fs_utils = (function() {
  // public
  return {
    /**
     * Performs a dee-remove on path.
     * 
     * @param  {[type]} path [description]
     * @return {[type]}      [description]
     */
    remove: function (path, callback) {
      var callback = callback || function () {};
      var rimraf = require('rimraf');

      rimraf(path, function (error) {
        if (error) {
          callback(error);
          return;
        }

        callback(null);
      });
    },

    /**
     * Moves directory from old path to new_path.
     * 
     * @param  {[type]}   old_path [description]
     * @param  {[type]}   new_path [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    move: function (old_path, new_path, callback) {
      callback = callback || function () {};
      var fs = require('fs');

      fs.rename(old_path, new_path, function (error) {
        if (error) {
          callback(error);
          return;
        }

        callback(null);
      });
    }
  };
})();

module.exports = fs_utils;



