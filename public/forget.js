(function () {
  // the other half of releasing the cards. the server can drop the token
  // hashes off the rows, but it cannot reach into this phone and take the
  // tokens themselves -- so after testing a hundred tags, this browser still
  // thinks it holds a hundred records. this is the broom for that
  var button = document.querySelector('[data-forget]');
  if (!button) return;

  var count = button.querySelector('[data-forget-n]');

  function mine() {
    var keys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf('fpe:token:') === 0 || k.indexOf('fpe:photo:') === 0)) keys.push(k);
      }
    } catch (e) {  }
    return keys;
  }

  function tally() {
    var n = mine().filter(function (k) { return k.indexOf('fpe:token:') === 0; }).length;
    if (count) count.textContent = String(n);
    button.disabled = n === 0;
    return n;
  }

  tally();

  button.addEventListener('click', function () {
    var keys = mine();
    if (!keys.length) return;
    if (!window.confirm('Forget ' + keys.length + ' stored item(s) on this device? Any record still held only by this browser becomes uneditable from here.')) return;
    try { keys.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {  }
    tally();
    button.textContent = 'THIS DEVICE HOLDS NOTHING';
  });
})();
