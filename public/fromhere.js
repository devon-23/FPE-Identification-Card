(function () {
  // same silent handoff as the small plot
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

    var map = L.map('map', { scrollWheelZoom: false, zoomControl: true });
    // openstreetmap's own tile servers are run by volunteers for small use,
    // and a night like this is not that -- they blocked us and started
    // serving an "access blocked" tile to everybody. esri's grey canvas is
    // keyless, goes deeper than we need, and suits the washed-out look.
    // note the {y}/{x} order, esri is the other way round to osm
    L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    }).addTo(map);

    var focus = null;
    try { focus = JSON.parse(document.getElementById('focus').textContent || 'null'); }
    catch (e) {  }

    var marked = null;

    pins.forEach(function (p) {
      var many = p.people.length > 1;
      var pin = L.circleMarker([p.lat, p.lon], {
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

      p.marker = pin;   // so FRØM HERE can open yours
      if (focus && p.lat === focus.lat && p.lon === focus.lon) marked = pin;
    });

    // to here, drawn last so it sits over everything
    var destMarker = L.circleMarker([dest.lat, dest.lon], {
      radius: 12, color: '#231f20', weight: 4, fill: false,
    }).addTo(map).bindPopup('<b>T\u00d8 HERE</b><br>' + esc(dest.label));

    function home() {
      map.setView([dest.lat, dest.lon], map.getSize().x < 500 ? 3 : 4);
    }

    // came off somebody's sighting log, so start over their town with their
    // pin already open. the TO HERE line still puts it back
    if (marked) {
      map.setView([focus.lat, focus.lon], 6);
      marked.openPopup();
    } else {
      home();
    }

    // TØ HERE is meant to read as the journey, so it pulls back to see the
    // whole country first and then crosses to the horseshoe, rather than
    // teleporting. flyTo on its own cuts the corner and loses the distance
    var recentre = document.querySelector('[data-recentre]');
    if (recentre) {
      recentre.addEventListener('click', function () {
        map.closePopup();
        var wide = map.getSize().x < 500 ? 3 : 4;
        if (map.getZoom() > wide + 1) {
          map.flyTo([dest.lat, dest.lon], wide, { duration: 2.2 });
          map.once('moveend', function () {
            map.flyTo([dest.lat, dest.lon], 16, { duration: 3.4 });
            map.once('moveend', function () { destMarker.openPopup(); });
          });
        } else {
          map.flyTo([dest.lat, dest.lon], 16, { duration: 3 });
          map.once('moveend', function () { destMarker.openPopup(); });
        }
      });
    }

    // FRØM HERE goes the other way: down onto whichever pin is yours. the
    // only thing we know about "yours" is what this browser is carrying,
    // and the town has to already be on the plot for there to be a pin
    var mine = document.querySelector('[data-mine]');
    if (mine) {
      // match on the designation, not the town. two people typing Columbus
      // differently land on the same pin, and p.town is only whichever
      // spelling got there first -- string matching missed everyone else
      var held = (window.FPEHeld && window.FPEHeld.ids()) || [];
      var ours = null;
      for (var i = 0; i < pins.length && !ours; i++) {
        for (var j = 0; j < pins[i].people.length; j++) {
          if (held.indexOf(pins[i].people[j].id) !== -1) { ours = pins[i]; break; }
        }
      }

      // nothing of theirs on the plot, so the title is just a title
      if (!ours) {
        mine.disabled = true;
      } else {
        mine.addEventListener('click', function () {
          map.closePopup();
          map.flyTo([ours.lat, ours.lon], 11, { duration: 3 });
          map.once('moveend', function () {
            if (ours.marker) ours.marker.openPopup();
          });
        });
      }
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  start();
})();
