'use strict';
var event_handler = require('./modules/event_handler');

event_handler.bind('app', 'ready', function (mainWindow) {
  mainWindow.setSize(1400, 900);

  // Open the OpenAppHackTools.
  mainWindow.webContents.openOAHTools({
    detach: true
  });
});

module.exports = event_handler.trigger
