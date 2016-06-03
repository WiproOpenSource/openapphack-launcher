var settings = null;

$(document).ready(function () {
  settings = window.openapphack.settings;

  var boot_log = $('#openapphack-dashboard-boot-log');
  if (boot_log.length && typeof settings.views.dashboard.boot_log !== 'undefined') {
    boot_log.find('.panel-body').append(decodeURI(settings.views.dashboard.boot_log));
  }
});