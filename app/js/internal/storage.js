'use strict';

var fs = require('fs');
var os = require('os');
var Q = require('q');

/**
 * Storage API.
 */
module.exports = function (filepath) {
  var remote = require('remote');
  var app = remote.require('app');

  var init = Q.defer();
  var load = Q.defer();

  // figure out the filetype from the extension
  var filetype = null;
  var matches = null;
  if (matches = filepath.match(/\.([^.]*)$/)) {
    filetype = matches[1];
  }

  fs.open(filepath, 'a', '0666', function (error, fd) {
    if (error == null) {
      init.resolve();

      return;
    }

    init.reject('Could not open/create ' + filepath + '.');
  });

  init.promise.then(function () {
    fs.readFile(filepath, 'utf-8', function (error, contents) {
      if (!error) {
        try {
          if (!contents) {
            contents = '{}';
          }

          load.resolve(parse(contents));
        }
        catch (exception) {
          load.reject('Could not parse ' + filepath + '. Exception: ' + exception);
        }
      }
    });
  });

  /**
   * Parses file and returns object.
   * 
   * @param  {[type]} contents [description]
   * @return {[type]}          [description]
   */
  function parse (contents) {
    switch (filetype) {
      case 'json':
        return JSON.parse(contents);

        break;

      case 'yaml':
      case 'yml':
        var yaml = require('yamljs');
        return yaml.parse(contents);

        break;

      default:
        return {};
    }
  };

  /**
   * Converts object to string.
   * 
   * @param  {[type]} obj [description]
   * @return {[type]}     [description]
   */
  function stringify (obj) {
    switch (filetype) {
      case 'json':
        return JSON.stringify(obj, 10, 2);

        break;

      case 'yaml':
      case 'yml':
        var yaml = require('yamljs');
        return yaml.stringify(obj, 10, 2);

        break;

      default:
        return {};
    }
  };

  return {
    /**
     * Returns a promise that resolves when the file is parsed.
     * 
     * @return {[type]} [description]
     */
    load: function (callback) {
      load.promise.then(function (data) {
        callback(null, data);
      })
      .catch(function (error) {
        callback(error, null);
      });
    },
    
    /**
     * Saves file.
     * 
     * @param  {[type]}   data     [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    save: function (data, callback) {
      callback = callback || function () {};

      // save the main settings file
      load.promise.then(function () {
        fs.writeFile(filepath, stringify(data), function (error) {
          if (error) {
            callback(error, null);
            return;
          }

          callback(null, data);
        });
      });
    }
  }
};
