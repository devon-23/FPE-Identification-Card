(function () {
  // the only thing we know about anybody is what their own browser kept.
  // if this device already holds an edit token then somebody standing here
  // has filed before, so point them at that record instead of a second one.
  //
  // soft on purpose: a new phone, cleared data or a private window all look
  // like a new person, and that is fine. this is a nudge, not a gate
  var held = document.querySelector('[data-held]');
  var fresh = document.querySelector('[data-held-hide]');
  if (!held || !fresh) return;

  var ids = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('fpe:token:') === 0) ids.push(k.slice(10));
    }
  } catch (e) { return; }

  if (!ids.length) return;

  // a provisional one first -- that is the person who plotted a town off the
  // map and has come back wanting the rest of the card
  ids.sort(function (a, b) { return rank(a) - rank(b); });

  function rank(id) {
    if (id.charAt(0) === 'Y') return 0;
    if (id.charAt(0) === 'X') return 1;
    return 2;
  }

  var id = ids[0];
  var slot = held.querySelector('[data-held-id]');
  if (slot) slot.textContent = 'FPE-' + id;
  // register sends them to the plain record if the thing is not theirs to
  // edit after all, so this is safe even when the token has gone stale
  held.querySelector('[data-held-link]').setAttribute('href', '/f/' + id + '/register');

  held.hidden = false;
  fresh.hidden = true;

  var anyway = held.querySelector('[data-action="anyway"]');
  if (anyway) {
    anyway.addEventListener('click', function () {
      held.hidden = true;
      fresh.hidden = false;
    });
  }
})();
