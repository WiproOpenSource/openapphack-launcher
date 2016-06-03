"use strict";

/**
 * Module for managing alert popups.
 */
var alert = (function() {
  // private
  var dom = '';
  var binding_element = null;
  var settings = {
    auto_position: true,
    auto_size: true,
    bind_inside: false,
    fade_time: 5000
  };

  function place (text) {
    dom.html(dom.html() + text);

    if (binding_element == null) {
      binding_element = $('body');
    } 

    // remove old alerts
    $('.floating-alert').remove();

    // determine position & dimensions of alert
    var position = binding_element.position();
    var top = position.top + binding_element.outerHeight() + 10;
    var left = position.left + 10;
    var width = binding_element.outerWidth() - 20;

    if (settings.auto_position) {
      dom.css('top', top);
    }

    if (settings.auto_size) {
      dom.css('left', left);
      dom.css('width', width);
    }

    if (settings.bind_inside) {
      binding_element.css('position', 'relative');
      binding_element.append(dom);
    }
    else {
      binding_element.after(dom);
    }

    if (settings.fade_time > -1) {
      setTimeout(function () {
        dom.fadeOut();
      }, settings.fade_time);
    }
  }

  // public
  return {
    /**
     * Creates new alert, binding it to specified DOM element.
     * 
     * @return {[type]} [description]
     */
    bind: function(el, config) {
      config = config || {};
      settings = $.extend(settings, config);
      
      binding_element = el;

      var markup =  '<div class="floating-alert alert">';
          markup += '  <button type="button" class="close" data-dismiss="alert" aria-label="Close">';
          markup += '    <span aria-hidden="true">&times;</span>';
          markup += '  </button>';
          markup += '</div>';

      // bootstrap's alert.js functionality
      dom = $(markup).alert();

      return this;
    },

    /**
     * Shows a status alert.
     * @param  {[type]} text [description]
     * @return {[type]}      [description]
     */
    status: function (text) {
      dom.addClass('alert-success');
      place(text);
    },

    /**
     * Shows an info alert.
     * @param  {[type]} text [description]
     * @return {[type]}      [description]
     */
    info: function (text) {
      dom.addClass('alert-info');
      place(text);
    },

    /**
     * Shows a warning alert.
     * @param  {[type]} text [description]
     * @return {[type]}      [description]
     */
    warning: function (text) {
      dom.addClass('alert-warning');
      place(text);
    },

    /**
     * Shows an error alert.
     * @param  {[type]} text [description]
     * @return {[type]}      [description]
     */
    error: function (text) {
      dom.addClass('alert-danger');
      place(text);
    }
  };
})();

module.exports = alert;