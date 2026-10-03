(function () {
  'use strict';

  var DISPLAY = '"Banknote Gothic", Copperplate, "Copperplate Gothic Light", "Lucida Sans", "Trebuchet MS", sans-serif';
  //lawd let banknote work.
  // the letterhead and the benediction only, same as the css
  var DEMA = '"Dema Gothic", ' + DISPLAY;
  var S = 3;
  var CW = 360;
  var PAD = 21;

  // the glyph frame, and how far in from the edge of that file the band sits.
  // has to agree with the border-image on .card or the png and the screen drift
  var FRAME = '/images/frame.webp';
  var SECTORS = '/images/dema_sectors.webp';
  var FRAME_SLICE = 130;
  var FRAME_W = 13;

  var C = {};

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    var get = function (n, f) { return (cs.getPropertyValue(n) || '').trim() || f; };
    C.paper = get('--paper', '#fff');
    C.ink = get('--ink', '#000');
    C.dim = get('--ink-dim', '#444');
    C.faint = get('--ink-faint', '#777');
    C.rule = get('--rule', '#000');
    C.red = get('--red', '#a3281f');
    C.plate = get('--plate', '#111');
    C.mark = {
      citizen: get('--mark-citizen', '#000'),
      escapee: get('--mark-escapee', '#a3281f'),
      bandito: get('--mark-bandito', '#909461'),
    };
  }

  function px(v) { return v * S; }
  function font(weight, size) { return weight + ' ' + px(size) + 'px ' + DISPLAY; }
  function display(weight, size) { return weight + ' ' + px(size) + 'px ' + DISPLAY; }
  function dema(weight, size) { return weight + ' ' + px(size) + 'px ' + DEMA; }

    function spreadText(ctx, text, left, right, baseline, size) {
    var chars = String(text).split('');
    var gap = px(size) * 0.45;
    var widths = [];
    var total = 0;
    for (var i = 0; i < chars.length; i++) {
      widths[i] = chars[i] === ' ' ? gap : ctx.measureText(chars[i]).width;
      total += widths[i];
    }
    var slack = (right - left - total) / Math.max(1, chars.length - 1);
    var x = left;
    ctx.textAlign = 'left';
    for (var j = 0; j < chars.length; j++) {
      if (chars[j] !== ' ') ctx.fillText(chars[j], x, baseline);
      x += widths[j] + slack;
    }
  }
  function centred(ctx, text, cx, y) { ctx.textAlign = 'center'; ctx.fillText(text, cx, y); }

    function wrap(ctx, text, maxWidth, size, weight) {
    ctx.font = font(weight, size);
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var next = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = words[i]; }
      else { line = next; }
    }
    if (line) lines.push(line);
    return lines;
  }

    function fit(ctx, text, maxWidth, size, weight, minSize, twoLines) {
    var s = size;
    ctx.font = font(weight, s);
    if (ctx.measureText(text).width <= maxWidth) return { lines: [text], size: s };

    if (twoLines && text.indexOf(' ') > -1) {
      var words = text.split(/\s+/);
      var best = null;
      for (var i = 1; i < words.length; i++) {
        var a = words.slice(0, i).join(' ');
        var b = words.slice(i).join(' ');
        var w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
        if (!best || w < best.w) best = { a: a, b: b, w: w };
      }
      if (best) {
        var t = s;
        while (t > minSize) {
          ctx.font = font(weight, t);
          if (Math.max(ctx.measureText(best.a).width, ctx.measureText(best.b).width) <= maxWidth) break;
          t -= 1;
        }
        return { lines: [best.a, best.b], size: t };
      }
    }

    while (s > minSize) {
      s -= 1;
      ctx.font = font(weight, s);
      if (ctx.measureText(text).width <= maxWidth) break;
    }
    return { lines: [text], size: s };
  }

    function desaturate(ctx, x, y, w, h) {
    // ctx.filter would be nicer but older iphones just ignore it
    var img = ctx.getImageData(x, y, w, h);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var g = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      g = ((g - 128) * 1.4 + 128) * 1.02;
      d[i] = d[i + 1] = d[i + 2] = g < 0 ? 0 : g > 255 ? 255 : g;
    }
    ctx.putImageData(img, x, y);
  }

  // paints a transparent png in one flat colour: draw it on its own, then
  // source-in a fill through whatever it covered
  function tinted(img, w, h, colour) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = colour;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function seal(ctx, cx, cy, size, bishopIdx, mark) {
    if (mark) {
      var d = size * 0.92;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(tinted(mark, d, d, C.red), cx - d / 2, cy - d / 2, d, d);
      ctx.restore();
      return;
    }
    sealDrawn(ctx, cx, cy, size, bishopIdx);
  }

  // hand drawn dema sectors
  // i worked too damn hard on this to delete, a simple google search would have just found the breach assets
  function sealDrawn(ctx, cx, cy, size, bishopIdx) {
    var R1 = size * 0.44, R0 = size * 0.25, RI = size * 0.19;
    var step = (Math.PI * 2) / 9;
    var gap = step * 0.1;
    var origin = -Math.PI / 2 - step / 2;

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, RI, 0, Math.PI * 2);
    ctx.strokeStyle = C.red;
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.stroke();
    ctx.restore();

    for (var i = 0; i < 9; i++) {
      var a0 = i * step + origin + gap / 2;
      var a1 = (i + 1) * step + origin - gap / 2;
      ctx.save();
      ctx.globalAlpha = i === bishopIdx ? 1 : 0.32;
      ctx.beginPath();
      ctx.arc(cx, cy, R1, a0, a1);
      ctx.arc(cx, cy, R0, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = C.red;
      ctx.fill();
      ctx.restore();
    }
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // border-image: <frame> 130 round, by hand, because canvas has no such thing.
  // corners go down whole, the four strips get tiled a whole number of times
  function nineSlice(ctx, img, w, h) {
    var sl = FRAME_SLICE;
    var b = px(FRAME_W);
    var sw = img.naturalWidth || img.width;
    var sh = img.naturalHeight || img.height;
    var midS = { x: sw - sl * 2, y: sh - sl * 2 };
    var midD = { x: w - b * 2, y: h - b * 2 };

    ctx.drawImage(img, 0, 0, sl, sl, 0, 0, b, b);
    ctx.drawImage(img, sw - sl, 0, sl, sl, w - b, 0, b, b);
    ctx.drawImage(img, 0, sh - sl, sl, sl, 0, h - b, b, b);
    ctx.drawImage(img, sw - sl, sh - sl, sl, sl, w - b, h - b, b, b);

    var scale = b / sl;
    var nx = Math.max(1, Math.round(midD.x / (midS.x * scale)));
    var ny = Math.max(1, Math.round(midD.y / (midS.y * scale)));
    var tw = midD.x / nx;
    var th = midD.y / ny;

    for (var i = 0; i < nx; i++) {
      ctx.drawImage(img, sl, 0, midS.x, sl, b + i * tw, 0, tw, b);
      ctx.drawImage(img, sl, sh - sl, midS.x, sl, b + i * tw, h - b, tw, b);
    }
    for (var j = 0; j < ny; j++) {
      ctx.drawImage(img, 0, sl, sl, midS.y, 0, b + j * th, b, th);
      ctx.drawImage(img, sw - sl, sl, sl, midS.y, w - b, b + j * th, b, th);
    }
  }

  // ---- the attached file ----------------------------------------------
  // same idea as the card: read what is on screen rather than rebuilding it

  var LABEL_W = 120;

  function readSheet(sheet) {
    var groups = [];
    var blocks = sheet.querySelectorAll('.rf__group');
    for (var i = 0; i < blocks.length; i++) groups.push(rows(blocks[i]));

    var notes = sheet.querySelector('.rf__notes');
    return {
      id: sheet.getAttribute('data-sheet') || '',
      groups: groups,
      heading: notes ? notes.querySelector('h3').textContent.trim() : '',
      body: notes ? notes.querySelector('p').textContent.trim() : '',
      tail: notes ? rows(notes) : [],
      faction: (String(sheet.className).match(/rf__sheet--(citizen|escapee|bandito)/) || [])[1] || null,
    };
  }

  function rows(el) {
    var out = [];
    var rs = el.querySelectorAll('.rf');
    for (var i = 0; i < rs.length; i++) {
      out.push({
        label: rs[i].querySelector('dt').textContent.trim().replace(/:$/, ''),
        value: rs[i].querySelector('dd').textContent.trim(),
      });
    }
    return out;
  }

  function sheetRow(ctx, r, x, y, valueW, draw) {
    // the value wraps, the label never does. returns the height either way
    var lines = wrap(ctx, r.value, px(valueW), 9, '400');
    if (draw) {
      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      ctx.font = display('400', 8);
      ctx.fillText(r.label + ':', x, y + px(8));
      ctx.fillStyle = r.value === '[REDACTED]' ? C.faint : C.red;
      ctx.font = display('400', 9);
      for (var i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + px(LABEL_W), y + px(8 + i * 13.5));
      }
    }
    return px(6 + Math.max(11, lines.length * 13.5));
  }

  function drawSheet(d, frame, badge) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var B = 13;                        // the frame, same as the css
    var inner = CW - B * 2;
    var padX = 12;
    var rowX = px(B + padX);
    var valueW = inner - padX * 2 - LABEL_W;

    // measure first, then size the canvas and draw it all again
    canvas.width = px(CW); canvas.height = px(2400);
    ctx = canvas.getContext('2d');

    var h = px(B);
    for (var g = 0; g < d.groups.length; g++) {
      h += px(10);
      for (var i = 0; i < d.groups[g].length; i++) h += sheetRow(ctx, d.groups[g][i], 0, 0, valueW, false);
      h += px(10) + px(1);
    }
    var bodyLines = wrap(ctx, d.body, px(inner - padX * 2), 9, '400');
    h += px(12) + px(8 + 8) + bodyLines.length * px(16) + px(12);
    for (var k = 0; k < d.tail.length; k++) h += sheetRow(ctx, d.tail[k], 0, 0, valueW, false) + px(2);
    h += px(12) + px(B);

    canvas.width = px(CW);
    canvas.height = Math.round(h);
    ctx = canvas.getContext('2d');

    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var y = px(B);
    for (var g2 = 0; g2 < d.groups.length; g2++) {
      y += px(10);
      for (var i2 = 0; i2 < d.groups[g2].length; i2++) {
        y += sheetRow(ctx, d.groups[g2][i2], rowX, y, valueW, true);
      }
      y += px(10);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = Math.max(1, px(1));
      ctx.beginPath();
      ctx.moveTo(px(B), y); ctx.lineTo(canvas.width - px(B), y); ctx.stroke();
      y += px(1);
    }

    y += px(12);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink;
    ctx.font = display('400', 8);
    ctx.fillText(d.heading, rowX, y + px(8));
    // the underline the css puts under it
    var hw = ctx.measureText(d.heading).width;
    ctx.beginPath();
    ctx.moveTo(rowX, y + px(10.5)); ctx.lineTo(rowX + hw, y + px(10.5));
    ctx.lineWidth = Math.max(1, px(0.5)); ctx.strokeStyle = C.ink; ctx.stroke();
    y += px(8 + 8);

    ctx.font = display('400', 9);
    for (var b = 0; b < bodyLines.length; b++) {
      ctx.fillText(bodyLines[b], rowX, y + px(9 + b * 16));
    }
    y += bodyLines.length * px(16) + px(12);

    for (var t = 0; t < d.tail.length; t++) {
      y += sheetRow(ctx, d.tail[t], rowX, y, valueW, true) + px(2);
    }

    if (badge) {
      var bw = px(160);
      var off = d.faction === 'bandito' ? px(48) : px(80);
      var edge = canvas.width - px(B);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px(B), px(B), canvas.width - px(B) * 2, canvas.height - px(B) * 2);
      ctx.clip();
      ctx.globalAlpha = d.faction === 'bandito' ? 0.7 : 0.5;
      ctx.drawImage(tinted(badge, bw, bw, C.mark[d.faction] || C.ink),
        edge - off - bw / 2, px(B + 12), bw, bw);
      ctx.restore();
    }

    if (frame) nineSlice(ctx, frame, canvas.width, canvas.height);

    return canvas;
  }

  function readCard(card) {
    // read the rendered card rather than rebuilding it, so the png cannot
    // disagree with what is on screen
    var t = function (sel) {
      var el = card.querySelector(sel);
      if (!el) return '';
      return (el.getAttribute('data-plain') || el.textContent).trim();
    };
    var charge = card.querySelectorAll('.card__charge span');
    var statute = card.querySelectorAll('.card__statute span');
    var facts = card.querySelectorAll('.card__facts .fact');
    var list = [];
    for (var i = 1; i < facts.length; i++) {
      list.push({
        label: facts[i].querySelector('dt').textContent.trim(),
        value: facts[i].querySelector('dd').textContent.trim(),
      });
    }
    var photo = card.querySelector('.card__photo');
    return {
      letterhead: t('.card__letterhead'),
      chargeTop: charge[0] ? charge[0].textContent.trim() : '',
      chargeMain: t('.card__charge b'),
      chargeBy: charge[1] ? charge[1].textContent.trim() : '',
      statute: [
        statute[0] ? statute[0].textContent.trim() : '',
        statute[1] ? statute[1].textContent.trim() : '',
      ],
      name: t('.fact--name dd'),
      facts: list,
      lyric: t('.card__lyric'),
      designation: t('.card__designation'),
      venue: t('.card__place b'),
      when: t('.card__place span'),
      // the foot's rule is a css decision, so ask the css
      footRule: (function () {
        var foot = card.querySelector('.card__foot');
        return !!foot && parseFloat(getComputedStyle(foot).borderTopWidth) > 0;
      }()),
      benediction: t('.card__foot'),
      photoSrc: photo ? photo.src : null,
      bandito: card.classList.contains('card--bandito'),
      faction: (String(card.className).match(/card--(citizen|escapee|bandito)/) || [])[1] || null,
      blank: card.classList.contains('card--blank'),
      bishop: parseInt(card.getAttribute('data-bishop') || '0', 10),
    };
  }

  function draw(d, photo, frame, sectors, badge) {
    // everything is measured in css pixels and multiplied by S at the end.
    // if you change the card css, change the numbers here too
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var inner = CW - PAD * 2;
    var plateW = inner * 0.38;
    var plateH = plateW * 1.25;
    var factsX = PAD + plateW + 14;
    var factsW = inner - plateW - 14;

    canvas.width = px(CW); canvas.height = px(1400);
    ctx = canvas.getContext('2d');
    var headLines = wrap(ctx, d.letterhead, px(inner), 8, '400');
    // one line, however small it has to get -- same as the card does it
    var nameFit = fit(ctx, d.name, px(factsW), 15, '700', 5, false);
    var lyricLines = wrap(ctx, d.lyric, px(inner - 8), 12, '400');

    var factsH = nameFit.lines.length * 19 + 4 + 8 + 10;
    for (var i = 0; i < d.facts.length; i++) factsH += 17 + 4 + 8 + 10;
    var bodyH = Math.max(plateH, factsH - 10);

    // the statute and the venue blocks can be commented out of the card. if
    // they are not on it, they do not go in the png either
    var hasStatute = !!(d.statute[0] || d.statute[1]);
    var hasPlace = !!(d.venue || d.when);

    var H = 18
      + headLines.length * 13 + 2
      + 6 + 42 + 12
      + 12 + 3 + 18 + 3 + 12
      + 10 + (hasStatute ? 24 : 0)
      + (hasStatute ? 16 : 0) + bodyH + 14
      + (d.lyric ? lyricLines.length * 18 : 0)
      + 10 + 42
      + 14 + (hasPlace ? 12 + 15 + 15 : 0)
      + 16 + (d.footRule ? 12 : 0) + 12
      + 16;

    canvas.width = Math.round(px(CW));
    canvas.height = Math.round(px(H));
    ctx = canvas.getContext('2d');

    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // used to be a plain rule:
    // ctx.strokeStyle = C.ink;
    // ctx.lineWidth = Math.max(2, px(1));
    // ctx.strokeRect(px(0.5), px(0.5), canvas.width - px(1), canvas.height - px(1));
    if (frame) nineSlice(ctx, frame, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var y = 18;

    ctx.fillStyle = C.red;
    ctx.font = dema('400', 8);
    spreadText(ctx, d.letterhead, px(PAD), canvas.width - px(PAD), px(y + 9), 8);
    y += 13 + 2 + 6;

    seal(ctx, cx, px(y + 21), px(42), d.bishop, sectors);
    y += 42 + 12;

    ctx.fillStyle = C.dim;
    ctx.font = font('400', 8);
    ctx.font = display('400', 8);
    centred(ctx, d.chargeTop, cx, px(y + 9));
    y += 12 + 3;
    ctx.fillStyle = d.blank ? C.dim : C.ink;
    ctx.font = display('700', 13);
    var mainFit = fit(ctx, d.chargeMain, px(inner), 13, '700', 8, false);
    ctx.font = display('700', mainFit.size);
    centred(ctx, d.chargeMain, cx, px(y + 14));
    y += 18 + 3;
    ctx.fillStyle = C.dim;
    ctx.font = display('400', 8);
    centred(ctx, d.chargeBy, cx, px(y + 9));
    y += 12 + 10;

    if (hasStatute) {
      ctx.fillStyle = C.dim;
      ctx.font = display('400', 8);
      centred(ctx, d.statute[0], cx, px(y + 9));
      centred(ctx, d.statute[1], cx, px(y + 21));
      y += 24 + 16;
    }

    var plx = px(PAD), ply = px(y), plw = px(plateW), plh = px(plateH);
    ctx.fillStyle = C.plate;
    ctx.fillRect(plx, ply, plw, plh);

    if (photo) {
      var side = Math.min(photo.naturalWidth, photo.naturalHeight);
      var sx = (photo.naturalWidth - side) / 2;
      var sy = (photo.naturalHeight - side) / 2;
      var srcW = side * 0.8;
      ctx.drawImage(photo, sx + (side - srcW) / 2, sy, srcW, side, plx, ply, plw, plh);
      desaturate(ctx, Math.round(plx), Math.round(ply), Math.round(plw), Math.round(plh));
    } else {
      ctx.fillStyle = '#2d2a23';
      var hc = plx + plw / 2;
      ctx.beginPath();
      ctx.arc(hc, ply + plh * 0.36, plw * 0.155, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hc - plw * 0.32, ply + plh * 0.78);
      ctx.arc(hc, ply + plh * 0.62, plw * 0.32, Math.PI, 0);
      ctx.lineTo(hc + plw * 0.32, ply + plh * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4e4a3f';
      ctx.font = font('400', 7);
      centred(ctx, 'NO IMAGE ON FILE', hc, ply + plh - px(5));
    }

    var fy = y;
    ctx.textAlign = 'left';

    function rule(atY) {
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = Math.max(1, px(1));
      ctx.setLineDash([px(1.5), px(2)]);
      ctx.beginPath();
      ctx.moveTo(px(factsX), px(atY));
      ctx.lineTo(px(factsX + factsW), px(atY));
      ctx.stroke();
      ctx.restore();
    }

    function label(text, atY) {
      ctx.fillStyle = C.ink;
      ctx.font = display('400', 7);
      ctx.fillText(text, px(factsX), px(atY + 7));
    }

    ctx.fillStyle = d.blank ? C.faint : C.red;
    ctx.font = font('700', nameFit.size);
    for (var n = 0; n < nameFit.lines.length; n++) {
      ctx.fillText(nameFit.lines[n], px(factsX + 1), px(fy + 14 + n * 19));
    }
    fy += nameFit.lines.length * 19 + 4;
    rule(fy);
    label('NAME', fy + 3);
    fy += 8 + 10;

    for (var k = 0; k < d.facts.length; k++) {
      var isId = d.facts[k].label === 'CITIZEN ID';
      ctx.fillStyle = d.facts[k].value === '[REDACTED]' ? C.faint : C.red;
      var vFit = fit(ctx, d.facts[k].value, px(factsW), 13, '400', 8, false);
      ctx.font = font(isId ? '700' : '400', vFit.size);
      ctx.fillText(d.facts[k].value, px(factsX + 1), px(fy + 13));
      fy += 17 + 4;
      rule(fy);
      label(d.facts[k].label, fy + 3);
      fy += 8 + 10;
    }
    y += bodyH + 14;

    if (d.lyric) {
      ctx.fillStyle = C.dim;
      ctx.font = font('400', 12);
      for (var b = 0; b < lyricLines.length; b++) centred(ctx, lyricLines[b], cx, px(y + 13 + b * 18));
      y += lyricLines.length * 18;
    }
    y += 10;

    ctx.fillStyle = d.blank ? C.dim : C.ink;
    var dFit = fit(ctx, d.designation, px(inner), 42, '700', 24, false);
    ctx.font = font('700', dFit.size);
    centred(ctx, d.designation, cx, px(y + 36));
    y += 42 + 14;

    if (hasPlace) {
      ctx.strokeStyle = C.rule;
      ctx.lineWidth = Math.max(1, px(1));
      ctx.beginPath(); ctx.moveTo(px(PAD), px(y)); ctx.lineTo(canvas.width - px(PAD), px(y)); ctx.stroke();
      y += 12;
      ctx.fillStyle = C.dim;
      ctx.font = display('400', 9);
      var vFit2 = fit(ctx, d.venue, px(inner), 9, '400', 6, false);
      ctx.font = display('400', vFit2.size);
      centred(ctx, d.venue, cx, px(y + 10));
      ctx.fillStyle = C.ink;
      ctx.font = display('400', 9);
      centred(ctx, d.when, cx, px(y + 25));
      y += 30 + 16;
    } else {
      y += 4;
    }

    if (d.footRule) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = Math.max(1, px(1));
      ctx.beginPath(); ctx.moveTo(px(PAD), px(y)); ctx.lineTo(canvas.width - px(PAD), px(y)); ctx.stroke();
      y += 12;
    }
    ctx.fillStyle = C.red;
    ctx.font = dema('400', 7);
    spreadText(ctx, d.benediction, px(PAD), canvas.width - px(PAD), px(y + 7), 7);

    // the allegiance mark, stamped over the top right and running off the
    // edge. last, so it sits on everything the way it does on the printed
    // cards, and clipped to the inside of the frame like the css does
    if (badge) {
      var bw = px(160);
      var edge = canvas.width - px(FRAME_W);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, edge, canvas.height);
      ctx.clip();
      ctx.globalAlpha = d.faction === 'bandito' ? 0.7 : 0.5;
      ctx.drawImage(tinted(badge, bw, bw, C.mark[d.faction] || C.ink),
        edge - bw / 2, px(12), bw, bw);
      ctx.restore();
    }

    return canvas;
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    if ('download' in a) {
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      return 'downloaded';
    }
    window.open(url, '_blank');
    return 'opened';
  }

  function toFile(canvas, filename) {
    return new Promise(function (r) { canvas.toBlob(r, 'image/png'); }).then(function (blob) {
      if (!blob) throw new Error('render failed');
      var file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file] })
          .then(function () { return 'shared'; })
          .catch(function (e) {
            if (e && e.name === 'AbortError') return 'cancelled';
            return download(blob, filename);
          });
      }
      return download(blob, filename);
    });
  }

  window.FPECard = {
    render: function (card) {
      readTheme();
      var d = readCard(card);
      return Promise.all([
        loadImage(d.photoSrc),
        loadImage(FRAME),
        loadImage(SECTORS),
        loadImage(d.faction ? '/images/' + d.faction.toLowerCase() + '.webp' : null),
      ]).then(function (imgs) {
        return draw(d, imgs[0], imgs[1], imgs[2], imgs[3]);
      });
    },
    save: function (card, filename) {
      return window.FPECard.render(card).then(function (c) { return toFile(c, filename); });
    },

    renderSheet: function (sheet) {
      readTheme();
      var d = readSheet(sheet);
      return Promise.all([
        loadImage(FRAME),
        loadImage(d.faction ? '/images/' + d.faction + '.webp' : null),
      ]).then(function (imgs) { return drawSheet(d, imgs[0], imgs[1]); });
    },

    saveSheet: function (sheet, filename) {
      return window.FPECard.renderSheet(sheet).then(function (c) { return toFile(c, filename); });
    },
  };
})();
