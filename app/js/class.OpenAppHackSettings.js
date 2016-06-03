"use strict";

var remote = require('remote');
var app = remote.require('app');

var OpenAppHackSettings = function () {
  GenericSettings.call(this, app.getPath('userData') + '/settings.json');
};

OpenAppHackSettings.prototype = Object.create(GenericSettings.prototype);
OpenAppHackSettings.prototype.constructor = OpenAppHackSettings;

OpenAppHackSettings.prototype.load = function (callback) {
  var callback = callback || function () {};
  var self = this;

  this._storage.load(function (error, data) {
    if (error !== null) {
      callback(error, data);
      return;
    }

    if (data == null) {
      data = {};
    }

    if (typeof data.plugins == 'undefined') {
      data.plugins = [];
    }

    if (typeof data.views == 'undefined') {
      data.views = {
        dashboard: {},
        settings: {}
      };
    }

    self.rePopulate(data);

    callback(error, data);
  });
};

OpenAppHackSettings.prototype.save = function (callback) {
  var callback = callback || function () {};

  var properties = this.getOwnProperties();
  
  // the plugins stored in window.openapphack.settings.plugins contains an
  // 'instance' property, which is an instantiated plugin object; that
  // object contains its own 'plugin' property, which is a reference to
  // the appropriate plugin in window.openapphack.settings.plugins; this
  // circular inheritance will cause issues if we try to stringify the
  // object as-is; the workaround is to build a temporary plain settings 
  // object (just for JSON sting~ification purposes) that doesn't contain
  // functions or object instances
  var instances = [];
  for (var j in properties.plugins) {
    if (typeof properties.plugins[j].instance == 'undefined') {
      continue;
    }
    
    properties.plugins[j].instance.preSave(properties.plugins[j].settings);

    instances[j] = properties.plugins[j].instance;
    delete properties.plugins[j].instance;
  }

  this._storage.save(properties, function (error, returned_data) {
    if (error) {
      callback(error, returned_data);
      return;
    }

    // re-populate the temporarily removed 'instance' objects
    for (var k in returned_data.plugins) {
      returned_data.plugins[k].instance = instances[k];
    }

    callback(null, returned_data);
  });
};

window['OpenAppHackSettings'] = OpenAppHackSettings;