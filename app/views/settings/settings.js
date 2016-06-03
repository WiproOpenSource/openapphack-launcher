// var storage = load_mod('internal/storage');
var alert = load_mod('components/alert');

var gitparse = require('git-url-parse');

var settings = null;

$(document).ready(function () {
  settings = window.openapphack.settings;
  
  // process "add plugin" form
  var add_plugin_form = $('#openapphack-settings-add-plugin');
  if (add_plugin_form.length) {
    var add_plugin_trigger = add_plugin_form.find('button.submit');
    add_plugin_trigger.click(function () {
      var field_git = add_plugin_form.find('input[name=git]');
      var git_value = gitparse(field_git.val());

      if (!git_value.name) {
        alert.bind(field_git);
        alert.error('Cannot parse provided Git URL.');
        return;
      }

      var field_name = add_plugin_form.find('input[name=name]');
      
      // we store the original user input in name_value_nice, to be used for
      // user-facing plugin names; name_value is a lowercase version (machine
      // name)
      var name_value = field_name.val();
      var name_value_nice = '';

      if (name_value) {
        name_value_nice = name_value;
      }
      // no user-provided name, default to git repository name
      else {
        name_value_nice = git_value.name;
        name_value = git_value.name;
      }

      // force machine name to be all lowercase, and strip non-alphanumeric
      // characters
      name_value = name_value.toLowerCase();
      name_value = name_value.replace(/\W/g, '');
      
      // ensure plugin name is not already in use
      for (var i in settings.plugins) {
        var plugin = settings.plugins[i];

        if (plugin.name == name_value) {
          alert.bind(field_name);
          alert.error('Plugin name "' + name_value_nice + ' (' + name_value + ')" already exists.');
          return;
        }
      }

      // basic plugin settings
      var plugin = {
        name: name_value,
        name_nice: name_value_nice,
        git: git_value.href,
        path: window.openapphack.plugins_path + '/' + name_value,
        enabled: 0 // disabled by default
      };

      // TODO: ensure filepath doesn't exist

      var spawn = require('child_process').spawn;
      var child = spawn('git', ['clone', git_value.href, window.openapphack.plugins_path + '/' + name_value]);

      child.on('exit', function (exit_code) {
        alert.bind(add_plugin_trigger.parent());

        if (exit_code) {
          alert.error('Could not clone Git repository to ' + window.openapphack.plugins_path + '/' + name_value + '.');
          return;
        }

        // add plugin to main settings & save
        settings.plugins.push(plugin);
        settings.save(function (error, data) {
          if (error !== null) {
            alert.error(error);
          }

          field_git.val('');
          field_name.val('');

          alert.status('Added "' + name_value_nice + '" plugin.');
          update_plugins_list();
        });
      });
    });
  }

  // load existing plugins
  var manage_plugins_table = $('#openapphack-settings-manage-plugins table');

  update_plugins_list();
  function update_plugins_list () {
    // build plugins table
    if (!manage_plugins_table.length) {
      return;
    }

    // ensure we start with a clean slate
    manage_plugins_table.find('.panel-body').empty();

    for (var i in settings.plugins) {
      var plugin = settings.plugins[i];
      if (manage_plugins_table.find('#row_plugin_' + plugin.name).length) {
        continue; // skip if this one is already in the table
      }

      // build row & append
      var row = get_plugin_row(plugin);
      manage_plugins_table.find('.panel-body').append(row);
    }
  }

  /**
   * Returns DOM for plugin <tr> row element.
   * 
   * @param  {[type]} plugin [description]
   * @return {[type]}        [description]
   */
  function get_plugin_row(plugin) {
    // name
    var td_name = $('<td>').append(plugin.name_nice);

    // toggle button
    var td_toggle = $('<td>').append($('<button>', {
      click: function() {
        toggle_plugin(this, plugin);
      },
      class: 'btn btn-sm btn-primary'
    }));

    td_toggle.find('button').eq(0).append($('<span>', {
      class: 'glyphicon glyphicon-' + (plugin.enabled ? 'check' : 'unchecked')
    }));

    // update button
    var td_update = $('<td>').append($('<button>', {
      click: function() {
        update_plugin(plugin);
      },
      class: 'btn btn-sm btn-primary'
    }));

    td_update.find('button').eq(0).append($('<span>', {
      class: 'glyphicon glyphicon-refresh'
    }));

    // remove button
    var td_remove = $('<td>');
    td_remove.append($('<button>', {
      click: function() {
        remove_plugin(plugin);
      },
      class: 'btn btn-sm btn-primary'
    }));

    td_remove.find('button').eq(0).append($('<span>', {
      class: 'glyphicon glyphicon-trash'
    }));

    // row <tr> containing all of the above <td>s
    var row = $('<tr>', {
      id: 'row_plugin_' + plugin.name
    });

    row.append(td_name);
    row.append(td_toggle);
    row.append(td_update);
    row.append(td_remove);

    return row;
  }

  /**
   * Re-runs the plugin and nav startup operations to instantly reflect
   * plugin updates.
   * @param  {[type]} error [description]
   * @return {[type]}       [description]
   */
  function run_plugin_startup_ops (error, callback) {
    var callback = callback || function () {};

    var dialog = load_mod('components/dialog').create('Updating configuration...');

    var success = function (result) {
      dialog.hide();
      callback();
    };

    runOps(['plugins', 'nav'], [dialog], success, error);
  }

  /**
   * Toggles plugin status and UI checkbox.
   * 
   * @param  {[type]} button [description]
   * @param  {[type]} plugin [description]
   * @return {[type]}        [description]
   */
  function toggle_plugin (button, plugin) {
    // toggle the checkbox and the plugin's enabled status
    if (plugin.enabled) {
      $(button).find('span').eq(0).removeClass('glyphicon-check').addClass('glyphicon-unchecked');
      plugin.enabled = 0;
    }
    else {
      $(button).find('span').eq(0).removeClass('glyphicon-unchecked').addClass('glyphicon-check');
      plugin.enabled = 1;
    }

    settings.save(function (error, data) {
      var alert = load_mod('components/alert');
      alert.bind(manage_plugins_table);

      if (error !== null) {
        alert.error(error);
      }

      alert.status('Updated plugins.');

      run_plugin_startup_ops(error);
    });
  }

  /**
   * Updates plugin from GIT.
   * 
   * @param  {[type]} plugin [description]
   * @return {[type]}        [description]
   */
  function update_plugin (plugin) {
    var fsu = load_mod('internal/fs_utils');

    var alert = load_mod('components/alert');
    alert.bind(manage_plugins_table);

    // http://stackoverflow.com/a/10727155
    var random_string = function (length) {
      return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
    }

    var old_path = plugin.path;
    var tmp_path = old_path + '_' + random_string(32);

    // save the current plugin code just in case update fails
    fsu.move(old_path, tmp_path, function (error) {
      if (error !== null) {
        alert.error(error);
        return;
      }

      var spawn = require('child_process').spawn;
      var child = spawn('git', ['clone', plugin.git, old_path]);

      child.on('exit', function (exit_code) {
        alert.bind(add_plugin_trigger.parent());

        if (exit_code) {
          alert.error('Could not clone Git repository to ' + old_path + '. Restoring original version.');
          
          fs.move(tmp_path, old_path, function (error) {
            if (error !== null) {
              alert.error(error);
              return;
            }
          });

          return;
        }

        fsu.remove(tmp_path, function(error) {
          if (error !== null) {
            alert.error(error);
            return;
          }
        });

        alert.status('Updated "' + plugin.name_nice + '" plugin.');
      });
    });
  }

  /**
   * Prompts user for plugin-removal confirmation.
   * 
   * @param  {[type]} plugin [description]
   * @return {[type]}        [description]
   */
  function remove_plugin (plugin) {
    bootbox.dialog({
      title: "Remove plugin: " + plugin.name_nice,
      message: 'This will remove "' + plugin.name_nice + '" plugin from OpenAppHack and delete associated plugin files.',
      buttons: {
        success: {
          label: "Cancel",
          className: "btn-default",
          callback: function () {
            // Do nothing.
          }
        },
        delete: {
          label: "Remove",
          className: "btn-danger",
          callback: function () {
            remove_plugin_action(plugin);
          }
        }
      }
    });
  }

  /**
   * Removes plugin.
   * 
   * @param  {[type]} plugin [description]
   * @return {[type]}        [description]
   */
  function remove_plugin_action (plugin) {
    var fsu = load_mod('internal/fs_utils');

    var alert = load_mod('components/alert');
    alert.bind(manage_plugins_table);

    fsu.remove(plugin.path, function (error) {
      if (error) {
        alert.error(error);
        return;
      }

      // filter-out plugin from settings
      settings.plugins = $.grep(settings.plugins, function(obj, idx) {
        return obj.name === plugin.name; 
      }, true);

      // update settings
      settings.save(function (error, data) {
        if (error !== null) {
          alert.error(error);
          return;
        }

        alert.status('Removed "' + plugin.name_nice + '" plugin.');

        run_plugin_startup_ops(error, update_plugins_list());
      });
    });
  }
});