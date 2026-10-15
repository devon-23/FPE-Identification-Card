(function () {
  // off the origin-only form. nothing is said about it on the page -- the pin
  // showing up is the whole message -- but the edit token is kept so the
  // record is theirs if they ever find it
  try {
    var handoff = location.hash.match(/^#t=([XYZ]\d{3,5})\.([A-Za-z0-9_-]{20,})$/);
    if (handoff) {
      localStorage.setItem('fpe:token:' + handoff[1], handoff[2]);
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch (e) {  }

  function start() {
    if (!window.L) return setTimeout(start, 50);

    var pins = JSON.parse(document.getElementById('pins').textContent || '[]');
    var dest = JSON.parse(document.getElementById('dest').textContent || '{}');

    var map = L.map('map', { scrollWheelZoom: false, attributionControl: true });
    // openstreetmap's own tile servers are run by volunteers for small use,
    // and a night like this is not that -- they blocked us and started
    // serving an "access blocked" tile to everybody. esri's grey canvas is
    // keyless, goes deeper than we need, and suits the washed-out look.
    // note the {y}/{x} order, esri is the other way round to osm
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    }).addTo(map);

    // the destination gets a ring instead of a dot so it reads as different
    var destMarker = L.circleMarker([dest.lat, dest.lon], {
      radius: 11, color: '#a3281f', weight: 3, fill: false, className: 'pin pin--dest',
    }).addTo(map);
    destMarker.bindPopup('<b>T\u00d8 HERE</b><br>' + dest.label);

    var bounds = [[dest.lat, dest.lon]];

    pins.forEach(function (p) {
      // one pin per town. it grows a little when more than one person is on it
      var many = p.people.length > 1;
      var m = L.circleMarker([p.lat, p.lon], {
        radius: many ? 8 : 6,
        color: '#000',
        weight: 2,
        fillColor: '#000',
        fillOpacity: 1,
      }).addTo(map);

      var rows = p.people.map(function (s) {
        return '<a href="/f/' + s.id + '">FPE-' + s.id + ' &middot; ' + esc(s.name) + '</a>';
      }).join('<br>');

      m.bindPopup(
        '<b>' + esc(p.town || '') + '</b>' +
        (many ? '<br>' + p.people.length + ' SUBJECTS' : '') +
        '<br>' + rows
      );
      bounds.push([p.lat, p.lon]);
    });

    // always opens on columbus, far enough out to take in most of the states.
    // fitting to the pins meant one person in australia zoomed everyone out.
    // a phone is a third the width of a laptop, so it needs a step further out
    map.setView([dest.lat, dest.lon], map.getSize().x < 500 ? 3 : 4);
    // map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  start();
})();
