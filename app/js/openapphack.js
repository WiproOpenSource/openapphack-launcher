var shell = require('shell');
var bootbox = require('bootbox');
var Q = require('q');
var os = require('os');

/***************************************************************
    Global items for access from all modules / files
***************************************************************/

require('./class.GenericSettings');
require('./class.OpenAppHackSettings');

require('./class.OpenAppHackPlugin');

// container for openapphack data
window.openapphack = {};
// settings data that will be written to settings.json; the only exception is
// window.openapphack.settings.plugins.##.instance, which is meant for temporary
// plugin-related data, and gets auto-removed by storage during save operation
window.openapphack.settings = function () {};

// the nav click callback will set this to the plugin responsible for the
// clicked nav item
window.active_plugin = false;

/**
 * Helper to load custom modules. Alleviates the need to provide a
 * relative filepath when loading a custom module from somewhere other than
 * a file in /app/
 *
 * @param  {[type]} src [description]
 * @return {[type]}     [description]
 */
window.load_mod = function (src) {
  return require('./' + src + '.js');
}

// shortcut reference
var settings = window.openapphack.settings;

var qc = load_mod('tools/qchain');
var nav = load_mod('components/nav');

var openapphackenv_running = false;

var OpenAppHackENV_START = "start";
var OpenAppHackENV_STOP = "stop";
var OpenAppHackENV_PROVISION = "provision";
var OpenAppHackENV_RELOAD = "reload";

// groups of startup operations; these will be performed sequentially;
// each operation will only execute if the previous one completed successfully;
// these are separated into sub-groups so that a grouped subset of these
// operations can be re-executed at a later time (ex. running plugins and nav ops
// again when the "manage plugins" form is updated)
window.openapphack_operations = {
  boot: [],
  plugins: [],
  nav: []
};

window.reloadCurrentView = function (callback) {
  nav.reloadCurrentView(callback);
};

/**
 * Runs operations in specified groups.
 *
 * @param  {[type]} groups  [description]
 * @param  {[type]} args    [description]
 * @param  {[type]} success [description]
 * @param  {[type]} error   [description]
 * @param  {[type]} step    [description]
 * @return {[type]}         [description]
 */
window.runOps = function (groups, args, success, error, step) {
  // default to all groups
  groups = groups || Object.keys(window.openapphack_operations);

  // default callbacks
  var success = success || function () {};
  var error = error || function () {};
  var step = step || function () {};

  // default arguments passed to each op
  var args = args || [];

  // build a flat array of operations from the desired groups
  var ops = [];
  for (var i in groups) {
    if (window.openapphack_operations.hasOwnProperty(groups[i])) {
      for (var j in window.openapphack_operations[groups[i]]) {
        ops.push(window.openapphack_operations[groups[i]][j]);
      }
    }
  }

  // build a chain of promises from the operations
  var chain = Q.fcall(function (){});

  var op_count = 0;
  ops.forEach(function (item) {
    var link = function () {
      var deferred = Q.defer();

      item.apply(item, args).then(function (result) {
        op_count++;

        step(op_count, ops.length);

        deferred.resolve(result);
      }, function (error) {
        deferred.reject(error);
      });

      return deferred.promise;
    };

    chain = chain.then(link);
  });

  chain.then(success, error);
};

$(document).ready(function () {
  // build and run startup operations
  var boot = load_mod('internal/boot');
  var dialog = load_mod('components/dialog').create('Reading configuration...');

  var ops = window.openapphack_operations;

  // boot group
  ops.boot.push(boot.loadSettings);
  ops.boot.push(boot.checkPluginsDir);
  // plugins group
  ops.plugins.push(boot.checkPlugins);
  ops.plugins.push(boot.bootPlugins);

  // navigation group
  ops.nav.push(boot.buildNavigation);

  // promise chain success callback
  var success = function (result) {
    dialog.hide();

    nav.loadFile(window.openapphack.public_path + '/views/dashboard/dashboard.html', function (error) {
      if (error) {
        console.log('Error: ' + error);
      }

      // save the dialog's content for use in dashboard.js
      window.openapphack.settings.views.dashboard.boot_log = encodeURI(dialog.getContent());
    });
  };

  // promise chain error callback
  var error = function (error) {
    dialog.append(error, 'error');
  };

  // promise chain step callback
  var step = function (count, total) {
    dialog.setProgress(count / total * 100);
  };

  runOps(null, [dialog], success, error, step);
});











// ------ Event Hookups ------ //

$("#provisionLink").click(function () {
  if(openapphackenv_running) {
    controlENV(OpenAppHackENV_PROVISION);
  }
  else {
    controlENV(OpenAppHackENV_START);
  }
});

$("#openapphackenv_start").click(function () {
  controlENV(OpenAppHackENV_START);
});


$("#openapphackenv_stop").click(function () {
  controlENV(OpenAppHackENV_STOP);
});


$("#openapphackenv_provision").click(function () {
  if(openapphackenv_running) {
    controlENV(OpenAppHackENV_PROVISION);
  }
  else {
    controlENV(OpenAppHackENV_START);
  }
});

function openapphackENVProcessing(modalTitle) {
  var contents = "<div class='progress'>";
  contents+= "<div class='progress-bar progress-bar-striped active' role=progressbar' aria-valuenow='100' aria-valuemin='0' aria-valuemax='100' style='width: 100%''>";
  contents+= "<span class='sr-only'>100% Complete</span>";
  contents+= "</div>";
  contents+= "</div>";
  contents+= "Details";
  contents+= "<div id='processingLog'>";
  contents+= "<pre></pre>";
  contents+= "</div>";

  var dialog = bootbox.dialog({
    title: modalTitle,
    message: contents
  });
}

function controlENV(action) {
  var title = '';
  var cmd = '';

  switch(action) {
    case OpenAppHackENV_START:
      cmd = 'up'
      title = 'Starting ENV';
      break;

    case OpenAppHackENV_STOP:
      cmd = 'halt';
      title = 'Stopping ENV';
      break;

    case OpenAppHackENV_PROVISION:
      cmd = 'provision';
      title = 'Re-provisioning ENV';
      break;

    case OpenAppHackENV_RELOAD:
      cmd = 'reload';
      title = 'Reloading ENV';
      break;
  }

  var spawn = require('child_process').spawn;
  var child = spawn('vagrant', [cmd, settings.ENV.id]);

  var dialog = load_mod('components/dialog').create(title);
  dialog.logProcess(child);

  child.on('exit', function (exitCode) {
    switch(action) {
      case OpenAppHackENV_START:
        if (!window.openapphack.ENV.needs_reprovision) {
          updateENVStatus(dialog);
          return;
        }

        controlENV(OpenAppHackENV_PROVISION);

        break;

      case OpenAppHackENV_STOP:
      case OpenAppHackENV_RELOAD:
        updateENVStatus(dialog);

        break;

      case OpenAppHackENV_PROVISION:
        hide_reprovision_notice();
        updateENVStatus(dialog);

        break;
    }
  });
}
