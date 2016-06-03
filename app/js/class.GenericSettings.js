"use strict";

// settings class
var GenericSettings = function (filepath) {
  // TODO: handle scenario with invalid filepath, else this will break
  this._filepath = filepath;
  this._storage = load_mod('internal/storage')(this._filepath);
};

/**
 * Re-populates the object with newly loaded data.
 * 
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
GenericSettings.prototype.rePopulate = function (data) {
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      this[key] = data[key];
    }
  }
};

/**
 * Loads file.
 * 
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
GenericSettings.prototype.load = function (callback) {
  var callback = callback || function () {};
  var self = this;

  this._storage.load(function (error, data) {
    if (error === null) {
      self.rePopulate(data);
    }

    callback(error, data);
  });
};

/**
 * Returns a plain key:value object of data that should be saved.
 * 
 * @return {[type]} [description]
 */
GenericSettings.prototype.getOwnProperties = function () {
  // internal properties that should be excluded
  var exclude = [
    '_filepath',
    '_storage'
  ];

  var properties = {};
  for (var i in this) {
    if (exclude.indexOf(i) !== -1) {
      continue;
    }

    if (this.hasOwnProperty(i)) {
      properties[i] = this[i];
    }
  }

  return properties;
};

/**
 * Saves the object to file.
 * 
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
GenericSettings.prototype.save = function (callback) {
  var callback = callback || function () {};

  this._storage.save(this.getOwnProperties(), function (error, returned_data) {
    if (error) {
      callback(error, returned_data);

      return;
    }

    callback(null, returned_data);
  });
};

window['GenericSettings'] = GenericSettings;