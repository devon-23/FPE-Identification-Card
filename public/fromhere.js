(function () {
  // same silent handoff as the small plot
  try {
    var handoff = location.hash.match(/^#t=(Y\d{3})\.([A-Za-z0-9_-]{20,})$/);
    if (handoff) {
      localStorage.setItem('fpe:token:' + handoff[1], handoff[2]);
      history.replaceState(null, '', location.pathname);
    }
  } catch (e) {  }

  function start() {
    if (!window.L) return setTimeout(start, 50);

    var pins = JSON.parse(document.getElementById('pins').textContent || '[]');
    var dest = JSON.parse(document.getElementById('dest').textContent || '{}');

    var map = L.map('map', { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    pins.forEach(function (p) {
      var many = p.people.length > 1;
      L.circleMarker([p.lat, p.lon], {
        radius: many ? 7 : 5,
        color: '#231f20',
        weight: 2,
        fillColor: '#ffd800',
        fillOpacity: 1,
      }).addTo(map).bindPopup(
        '<b>' + esc(p.town || '') + '</b>' +
        (many ? '<br>' + p.people.length + ' SUBJECTS' : '') +
        '<br>' + p.people.map(function (s) {
          return '<a href="/f/' + s.id + '">FPE-' + s.id + ' &middot; ' + esc(s.name) + '</a>';
        }).join('<br>')
      );
    });

    // to here, drawn last so it sits over everything
    L.circleMarker([dest.lat, dest.lon], {
      radius: 12, color: '#231f20', weight: 4, fill: false,
    }).addTo(map).bindPopup('<b>TO HERE</b><br>' + esc(dest.label));

    map.setView([dest.lat, dest.lon], map.getSize().x < 500 ? 3 : 4);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  start();
})();
