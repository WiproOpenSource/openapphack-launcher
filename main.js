// main.js

// Module to control application life.
var app = require('app');

// Module to create native browser window.
var BrowserWindow = require('browser-window');
var mainWindow = null;

// Report crashes to our server.
require('crash-reporter').start();

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// Force single instance of application
var shouldQuit = app.makeSingleInstance(function(commandLine, workingDirectory) {
  // Someone tried to run a second instance, we should focus our window
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  }

  return true;
});

if (shouldQuit) {
  app.quit();
  return;
}

app.on('ready', function() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    center: true
  });

  mainWindow.loadUrl('file://' + __dirname + '/app/index.html');

  mainWindow.setMenuBarVisibility(false);

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {

    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  // allow local config access to mainWindow via custom event bindings
  var fs = require('fs');
  var config_path = './app/local_config.js';
  fs.exists(config_path, function (exists) {
    if (exists) {
      var trigger = require(config_path);
      trigger('app', 'ready', [mainWindow]);
    }
  });
});
