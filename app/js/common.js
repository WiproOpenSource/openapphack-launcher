// this file gets re-loaded on every call of nav.js's loadFile; it is loaded 
// after the individual view & view's own JS files;
// 
// contains functionality common to all views

$(document).ready(function () {
  var shell = require('shell');

  // links and buttons that open URLs in external browser
  $('a.openExternal, button.openExternal').click(function (e) {
    e.preventDefault();

    var el = $(this);
    var src = el.attr('href');
    if (src) {
      shell.openExternal(src);
    }
  });

  $('.placeholder').click(function (e) {
    e.preventDefault();

    var el = $(this);
    var placeholder = '';
    if (placeholder = el.attr('placeholder')) {
      alert(placeholder);
    }
  });
});