var os = require('os');

// constructor
var OpenAppHackPlugin = function (plugin, dialog) {
  this.plugin = plugin;
  this.dialog = dialog;
};

OpenAppHackPlugin.prototype.getUniqueName = function () {
  if (!this.unique_name) {
    this.unique_name = this.plugin.name + '-' + this.plugin.name_nice.toLowerCase().replace(/\W/g, '');
  }

  return this.unique_name;
};

OpenAppHackPlugin.prototype.getBootOps = function () {
  return [];
};

OpenAppHackPlugin.prototype.getNav = function () {
  return [];
};

OpenAppHackPlugin.prototype.log = function (message) {
  var log = '';

  if (this.plugin.name_nice) {
    log += this.plugin.name_nice + ': ';
  }
  else if (this.plugin.name) {
    log += this.plugin.name + ': ';
  }

  log += message + os.EOL;

  return log;
};

OpenAppHackPlugin.prototype.logDialog = function (message) {
  if (this.dialog) {
    this.dialog.append(this.log(message));
  }
};

OpenAppHackPlugin.prototype.addCSS = function (path, success, error) {
  // optional callbacks
  var success = success || function () {};
  var error = error || function () {};
  
  // create link tag
  var element = document.createElement('link');
  element.type = 'text/css';
  element.async = true;
  element.href = this.plugin.path + '/' + path;
  element.rel = 'stylesheet';
  element.onreadystatechange = function() {
    if (this.readyState == 'complete' || this.readyState == 'loaded') {
      success();
    }
  };
  element.onload = success;
  element.onerror = error;

  // insert the tag next to an existing base or link element
  var target = document.getElementsByTagName('base')[0] || document.getElementsByTagName('link')[0];
  target.parentNode.insertBefore(element, target);
};

OpenAppHackPlugin.prototype.preSave = function (settings) {

};

window['OpenAppHackPlugin'] = OpenAppHackPlugin;