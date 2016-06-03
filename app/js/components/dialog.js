"use strict";

/**
 * Module for managing Bootbox dialogs.
 */
var dialog = (function() {
  // private
  
  // bootbox element is assigned to this var in create()
  var dialog = {};

  // default settings/configuration object
  var settings = {
    auto_scroll: true,
    hide_after_process: false
  };

  // child process for writing user input
  var child = {};

  // dom elements
  var dom_input = null;
  var dom_submit = null;

  /**
   * Returns HTML template for Dialog's content.
   * @return {[type]} [description]
   */
  function template() {
    var output = '';

    output += '<div class="progress">';
    output += '  <div class="progress-bar progress-bar-striped active"';
    output += '       role="progressbar"';
    output += '       aria-valuemin="0"';
    output += '       aria-valuemax="100"';
    output += '       aria-valuenow="0"';
    output += '       style="width: 0">';
    output += '    <span class="sr-only">100% Complete</span>';
    output += '  </div>';
    output += '</div>';

    output += 'Details';
    output += '<pre class="processingLog"></pre>';

    output += '<input type="textfield" class="console-input" />';
    output += '<input type="submit" value="Submit" class="console-submit" />';

    return output;
  }

  // public
  return {
    /**
     * Creates & returns new Dialog object.
     * 
     * @return {[type]} [description]
     */
    create: function(title, config) {
      if (typeof title == 'undefined') {
        title = '';
      }

      if (typeof config == 'undefined') {
        config = {};
      }

      this.setSettings(config);

      dialog = bootbox.dialog({
        title: title,
        message: template()
      });

      // find & disable inputs until they're required
      dom_input = dialog.find('input.console-input');
      dom_submit = dialog.find('input.console-submit');
      dom_input.attr('disabled', 'disabled')
      dom_submit.attr('disabled', 'disabled')

      // set up input processing
      dom_submit.click(function () {
        if (!child) {
          return;
        }
        
        child.on('close', function () {
          dom_input.attr('disabled', 'disabled')
          dom_submit.attr('disabled', 'disabled')
        });

        var value = dom_input.val();
        child.stdin.write(value);
        child.stdin.write('\n');

        // clear input
        dom_input.val('');
      });

      return this;
    },

    /**
     * Extends existing settings with config object.
     */
    setSettings: function (config) {
      settings = $.extend(settings, config);
    },

    /**
     * Updates the progressbar value.
     * @param {[type]} percentage [description]
     */
    setProgress: function (percentage) {
      if (typeof percentage != 'number' || percentage < 0 || percentage > 100) {
        return;
      }

      var bar = dialog.find('.progress-bar');
      bar.attr('aria-valuenow', percentage);
      bar.css('width', percentage + '%');
    },

    /**
     * Returns Bootbox Dialog.
     * 
     * @return {[type]}    [description]
     */
    get: function() {
      return dialog;
    },

    /**
     * Returns dialog's content.
     * 
     * @return {[type]} [description]
     */
    getContent: function () {
      var log = dialog.find('.processingLog');
      return log.html();
    },

    /**
     * Appends content to processingLog.
     * @param  {[type]} content [description]
     */
    append: function (content, type) {
      // support for data straight from Buffer
      if (content instanceof Buffer) {
        content = content.toString('utf8');
      }

      if (typeof type == 'undefined') {
        type = 'status';
      }

      switch (type) {
        case 'error':
          content = '<div class="error">' + content + '<div>';
          break;
        case 'warning':
          content = '<div class="warning">' + content + '<div>';
          break;
        case 'status':
        default:
      }

      var log = dialog.find('.processingLog');
      log.append(content);

      if (settings.auto_scroll) {
        log.scrollTop(log.get(0).scrollHeight);
      }
    },
    
    /**
     * Writes buffer output to dialog's log.
     * 
     * @param  {[type]} process        [description]
     * @param  {[type]} outputCallback [description]
     * @param  {[type]} append         [description]
     * @return {[type]}                [description]
     */
    logProcess: function (process, outputCallback, append) {
      var self = this;

      append = (typeof append != 'undefined') ? append : true;

      var promise = new Promise(function (resolve, reject) {
        var write = function (buffer) {
          var content = buffer.toString('utf8');
          
          if (typeof outputCallback == 'function') {
            outputCallback(content);
          }

          if (append) {
            self.append(content);
          }
        };

        process.stdout.on('data', write);
        process.stderr.on('data', write);

        process.on('exit', function (exitCode) {
          if (settings.hide_after_process) {
            self.hide();
          }

          resolve();
        });
      });

      return promise;
    },

    /**
     * Sets child process.
     * 
     * @param {[type]} process [description]
     */
    setChildProcess: function (process) {
      child = process;

      // the only reason to be setting a child process is to pass it user
      // input, so enable the input elements
      dom_input.removeAttr('disabled');
      dom_submit.removeAttr('disabled');
    },

    /**
     * Hides Dialog.
     */
    hide: function () {
      dialog.modal('hide');
    }
  };
})();

module.exports = dialog;