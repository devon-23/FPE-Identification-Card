(function () {
  var button = document.querySelector('[data-filters]');
  var panel = document.getElementById('filters');
  if (!button || !panel) return;

  // open already if a filter is on, so nobody wonders why the register
  // looks short
  button.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var first = panel.querySelector('select');
      if (first) first.focus();
    }
  });
})();
