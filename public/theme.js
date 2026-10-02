// Light/dark switch. The stored choice is applied inline in <head> so there
// is no flash; this only handles the button.
(function () {
  var root = document.documentElement;

  function current() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light' : 'dark';
  }

  var buttons = document.querySelectorAll('[data-theme-toggle]');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      var next = current() === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fpe:theme', next); } catch (e) { /* private mode */ }
    });
  }
})();
