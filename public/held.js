(function () {
  // the only thing we know about anybody is what their own browser kept.
  // every record this device filed left an edit token behind, so that is the
  // list. a new phone, cleared data or a private window all look like a new
  // person, and that is fine -- this is a nudge, not a gate
  window.FPEHeld = {
    ids: ids,
    provisional: provisional,
    isProvisional: isProvisional,
    names: names,
    forget: forget,
  };

  // everything this device holds, a numbered card included. somebody who
  // claimed FPE-0042 at the show is already in the register, and plotting a
  // town would file them a second time
  function ids() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('fpe:token:') !== 0) continue;
        var id = k.slice(10);
        if (/^(?:[XYZ]\d{3,5}|\d{4})$/.test(id)) out.push(id);
      }
    } catch (e) {  }
    // numbered cards first -- that is the one somebody actually holds
    return out.sort(function (a, b) {
      return (isProvisional(a) ? 1 : 0) - (isProvisional(b) ? 1 : 0) || (a < b ? -1 : a > b ? 1 : 0);
    });
  }

  // the made-on-demand ones. only these can be withdrawn or moved onto a card
  function isProvisional(id) { return /^[XYZ]\d{3,5}$/.test(id); }
  function provisional() { return ids().filter(isProvisional); }

  function names(list) {
    if (!list.length) return Promise.resolve([]);
    return fetch('/held?ids=' + encodeURIComponent(list.join(',')))
      .then(function (r) { return r.ok ? r.json() : []; })
      .catch(function () { return []; });
  }

  function forget(id) {
    var body = new FormData();
    try { body.append('token', localStorage.getItem('fpe:token:' + id) || ''); } catch (e) {  }
    return fetch('/f/' + id + '/forget', { method: 'POST', body: body })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) throw new Error(d.error || 'COULD NOT WITHDRAW IT');
        try {
          localStorage.removeItem('fpe:token:' + id);
          localStorage.removeItem('fpe:photo:' + id);
        } catch (e) {  }
        return d;
      });
  }

  // the front door. with nothing on file, the door is a form that files a
  // designation and drops them straight into the card. with something on
  // file it stays a link to the page that lists what they have
  var gateNew = document.querySelector('[data-gate-new]');
  var gateHeld = document.querySelector('[data-gate-held]');
  if (gateNew && gateHeld && !ids().length) {
    gateNew.hidden = false;
    gateHeld.hidden = true;
  }

  var held = document.querySelector('[data-held]');
  var fresh = document.querySelector('[data-held-hide]');
  if (!held || !fresh) return;

  var mine = ids();

  // the form tells the server which letter to use: the first one this device
  // is not already carrying. withdraw your Y and the next one is a Y again,
  // rather than skipping down to Z and leaving a hole
  var LETTERS = ['X', 'Y', 'Z'];
  var have = {};
  mine.filter(isProvisional).forEach(function (id) { have[id.charAt(0)] = true; });
  var next = 0;
  while (next < LETTERS.length && have[LETTERS[next]]) next++;

  var seq = document.querySelector('[data-seq]');
  if (seq) seq.value = String(next);

  if (!mine.length) return;

  var atLimit = next >= LETTERS.length;

  held.querySelector('[data-held-head]').textContent = mine.length === 1
    ? 'THIS TERMINAL ALREADY HOLDS A FILE.'
    : 'THIS TERMINAL ALREADY HOLDS ' + mine.length + ' FILES.';

  if (atLimit) {
    held.querySelector('[data-held-note]').hidden = false;
    held.querySelector('[data-action="anyway"]').hidden = true;
  }

  var list = held.querySelector('[data-held-list]');
  paint(mine.map(function (id) { return { id: id, name: null }; }));
  names(mine).then(function (rows) {
    if (rows.length) paint(rows);
  });

  function paint(rows) {
    list.textContent = '';
    rows.forEach(function (row) {
      var li = document.createElement('li');

      var tag = document.createElement('b');
      tag.textContent = 'FPE-' + row.id;
      li.appendChild(tag);

      if (row.name) {
        var who = document.createElement('span');
        who.textContent = row.name;
        li.appendChild(who);
      }

      var edit = document.createElement('a');
      edit.href = '/f/' + row.id + '/register';
      edit.textContent = 'AMEND';
      li.appendChild(edit);

      // an issued card cannot be withdrawn here -- somebody is carrying that
      // number, and dropping the row would strand the tag
      if (!isProvisional(row.id)) {
        list.appendChild(li);
        return;
      }

      var drop = document.createElement('button');
      drop.type = 'button';
      drop.textContent = 'WITHDRAW';
      drop.addEventListener('click', function () {
        if (!window.confirm('Withdraw FPE-' + row.id + '? The record is deleted and the designation goes back.')) return;
        drop.disabled = true;
        drop.textContent = 'WITHDRAWING…';
        forget(row.id)
          .then(function () { location.reload(); })
          .catch(function (e) {
            drop.textContent = String(e.message || 'FAILED');
            drop.disabled = false;
          });
      });
      li.appendChild(drop);

      list.appendChild(li);
    });
  }

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
