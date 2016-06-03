'use strict';

var os      = require('os');
var fs      = require('fs');
var Q       = require('q');

/**
 * Boot tasks.
 */
module.exports = (function () {
  return {
    /**
     * Loads & parses settings.json into the `window.openapphack.settings` object.
     * 
     * @param  {[type]} dialog [description]
     * @return {[type]}        [description]
     */
    loadSettings: function (dialog) {
      var deferred = Q.defer();

      dialog.append('Loading OpenAppHack settings.' + os.EOL);

      // re-create the settings object
      window.openapphack.settings = new OpenAppHackSettings();

      // set useful paths
      var remote = require('remote');
      var app = remote.require('app');

      window.openapphack.user_data_path = app.getPath('userData');
      window.openapphack.plugins_path = app.getPath('userData') + '/plugins';
      window.openapphack.app_path = app.getAppPath();
      window.openapphack.public_path = app.getAppPath() + '/app';

      window.openapphack.settings.load(function (error, data) {
        if (error !== null) {
          deferred.reject(error);
          return;
        }

        deferred.resolve();
      });

      return deferred.promise;
    },

    /**
     * Checks for presense of plugins directory; creates it if missing.
     * @param  {[type]} dialog [description]
     * @return {[type]}        [description]
     */
    checkPluginsDir: function (dialog) {
      var deferred = Q.defer();

      dialog.append('Checking for plugins.' + os.EOL);

      fs.stat(window.openapphack.plugins_path, function (error, stats) {
        if (error || !stats.isDirectory()) {
          dialog.append('Plugins directory not found; attepting to create.' + os.EOL);

          var mode = parseInt('0700', 8);
          fs.mkdir(window.openapphack.plugins_path, mode, function (error) {
            if (error) {
              deferred.reject('Could not create plugins directory: ' + window.openapphack.plugins_path);

              return;
            }

            dialog.append('Created plugins directory: ' + window.openapphack.plugins_path + '.' + os.EOL);
            deferred.resolve();
          });

          return;
        }

        dialog.append('Found plugins directory: ' + window.openapphack.plugins_path + '.' + os.EOL);
        deferred.resolve();
      });

      return deferred.promise;
    },

    /**
     * Ensures all plugins in window.openapphack.settings.plugins have codebases, and match OpenAppHack
     * plugin requirements.
     * 
     * @param  {[type]} dialog [description]
     * @return {[type]}        [description]
     */
    checkPlugins: function (dialog) {
      // clear the global-notices container which may have been populated by
      // plugins prior to this operation being ran
      $('#global-notices').empty();

      var chain = Q.fcall(function (){});
      
      // no plugins present
      if (!window.openapphack.settings.plugins.length) {
        return chain;
      }

      // build a promise chain where each link handles a single plugin
      var found_plugins = [];
      window.openapphack.settings.plugins.forEach(function (plugin) {
        var link = function () {
          var deferred = Q.defer();

          fs.stat(plugin.path, function (error, stats) {
            dialog.append('Checking plugin: ' + plugin.name_nice + '.' + os.EOL);

            // plugin files found; check for main.js entry-point
            if (!error && stats.isDirectory()) {
              var plugin_main_path = plugin.path + '/main.js';
              fs.stat(plugin_main_path, function (error, stats) {
                // entry-point found; load the plugin & save this plugin to the "found" array
                if (!error && stats.isFile()) {
                  var plugin_class = require(plugin_main_path);

                  plugin.instance = new plugin_class(plugin, dialog);

                  found_plugins.push(plugin);

                  deferred.resolve();
                  return;
                }

                deferred.reject('Malformed plugin: ' + plugin.name_nice + '. Missing main.js.');
                return;
              });

              return;
            }
            
            dialog.append('Plugin files not found in ' + plugin.path + '. Removing plugin.' + os.EOL);
            deferred.resolve();
          });
          
          return deferred.promise;
        }
        
        chain = chain.then(link);
      });
      
      // now that we've checked all plugins, update the plugin object with the
      // array of found plugins, and write to settings file
      chain = chain.then(function () {
        var deferred = Q.defer();

        window.openapphack.settings.plugins = found_plugins;

        window.openapphack.settings.save(function () {
          deferred.resolve();
        });

        return deferred.promise;
      });
      
      return chain;
    },

    /**
     * Runs boot scripts in all plugins.
     * 
     * @return {[type]} [description]
     */
    bootPlugins: function (dialog) {
      var chain = Q.fcall(function (){});

      // no plugins present
      if (!window.openapphack.settings.plugins.length) {
        return chain;
      }
      
      dialog.append('Booting plugins.' + os.EOL);

      var operations = [];
      window.openapphack.settings.plugins.forEach(function (plugin) {
        if (!plugin.enabled) {
          return;
        }

        plugin.instance.getBootOps().forEach(function (op) {
          operations.push({
            op: op,
            self: plugin.instance
          });
        });
      });

      var op_count = 0;
      operations.forEach(function (item) {
        var link = function () {
          var deferred = Q.defer();
          
          // we pass the plugin instance as the 'this' context to the operation
          item.op.apply(item.self, [ dialog ]).then(function (result) {
            op_count++;
            dialog.setProgress(op_count / operations.length * 100);

            deferred.resolve(result);
          }, function (error) {
            deferred.reject(error);
          });

          return deferred.promise;
        };

        chain = chain.then(link);
      });

      return chain;
    },

    /**
     * Builds main navigation from core & plugin links.
     * 
     * @param  {[type]} dialog [description]
     * @return {[type]}        [description]
     */
    buildNavigation: function (dialog) {
      var deferred = Q.defer();

      dialog.append('Building navigation.' + os.EOL);

      var nav = load_mod('components/nav');
      nav.setContainer('#view-wrap');
      
      // array of menu items; used to remove active class from non-clicked items
      var items = [];

      /**
       * Helper to create DOM and load source file.
       * 
       * @param  {[type]} nav_struct [description]
       * @return {[type]}            [description]
       */
      var build_nav = function (nav_struct) {
        // create DOM structure and append to page
          var template = '';

          if (nav_struct.title) {
            template += '<li class="title">' + nav_struct.title + '</li>';
          }

          for (var i in nav_struct.items) {
            var item = nav_struct.items[i];

            template += '<li class="view"><a href="' + item.href + '">' + item.text + '</a></li>';
          }

          template = '<ul class="nav nav-stacked" id="nav-' + nav_struct.plugin.instance.unique_name + '">' + template + '</ul>';

          $('nav').append(template);

        // associate links with pages and callbacks
          $('nav #nav-' + nav_struct.plugin.instance.unique_name + ' a').each(function (i, el) {
            el = $(el);
            items.push(el);

            if (el.attr('href') != '#') {
              nav.addNavItem(el, function (error) {
                if (error) {
                  console.log('error: ' + error);
                  return;
                }

                // remove 'active' class from all nav items
                items.forEach(function (item, i) {
                  $(item).parent().removeClass('active');
                });

                // add 'active' class to clicked nav item
                el.parent().addClass('active');

                window.active_plugin = nav_struct.plugin.instance;
              });
            }
          });
      };

      // create core OpenAppHack navigation
        var openapphack_nav = {
          plugin: {
            instance: {
              unique_name: 'openapphack'
            }
          },
          title: 'OpenAppHack',
          items: [
            {
              href: window.openapphack.public_path + '/' + 'views/dashboard/dashboard.html',
              name: 'dashboard',
              text: '<i class="fa fa-cogs"></i> Dashboard',
            },
            {
              href: window.openapphack.public_path + '/' + 'views/settings/settings.html',
              name: 'settings',
              text: '<i class="fa fa-cogs"></i> Settings',
            }
          ]
        };

        $('nav').empty();
        build_nav(openapphack_nav);

      // no plugins present
        if (!window.openapphack.settings.plugins.length) {
          deferred.resolve();
          return deferred.promise;
        }
      
      // create navigation for enabled plugins
        window.openapphack.settings.plugins.forEach(function (plugin, key) {
          if (!plugin.enabled) {
            return;
          }

          // a plugin doesn't have to implement a nav
          if (typeof plugin.instance.getNav !== 'function') {
            return;
          }

          var plugin_nav = plugin.instance.getNav();
          plugin_nav.plugin = plugin;

          for (var i in plugin_nav.items) {
            // each menu item must have a value for href
            if (typeof plugin_nav.items[i].href == 'undefined' || !plugin_nav.items[i]) {
              plugin_nav.items[i] = '#';
            }
            // the href must be an absolute value
            else {
              plugin_nav.items[i].href = plugin.path + '/' + plugin_nav.items[i].href;
            }

            // each menu item must have a value for text
            if (typeof plugin_nav.items[i].text == 'undefined' || !plugin_nav.items[i].text) {
              plugin_nav.items[i].text = '';
            }
          }

          build_nav(plugin_nav);
        });

      deferred.resolve();
      return deferred.promise;
    }
  }
})();
