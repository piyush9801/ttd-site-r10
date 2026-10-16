/* The Talent Dept. · round 10 hero.
   A: Line of Sight, made literal. The statement is printed on the page; each word's Ink dash is a card that floats in
   front of it at its own depth, sized so that, seen straight on, every card sits exactly over its word: a still row
   of dashes and no text. Move and your line of sight moves: the whole room turns a few degrees, the cards part from
   their words by their own distances, and the words show through where they open. The card nearest the cursor lifts
   further towards you. Behind, the Draft replies, a soft far field and four out-of-focus dashes near the lens each
   move by their own depth. Scroll and the cards turn edge-on in reading order, the coral one last into the full
   stop, while the replies leave to the right. ?hero=b: the rhythm wall, which comes down into the city.
   Nothing moves on its own: when the cursor rests, the room comes back into line and the loop stops. Phones: the
   scroll opens it; on Android, tilting the phone moves the line of sight. */
(function () {
  var H = document.querySelector('.hero4'), root = document.documentElement;
  if (!H || root.classList.contains('still')) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var B = root.classList.contains('hero-b');
  var P = 1100;                                  // the perspective (css: .hero4 .stage)
  var stage = H.querySelector('.stage');
  var els = [].slice.call(H.querySelectorAll(B ? '.bars i' : '.far i'));
  var wds = B ? [] : [].slice.call(H.querySelectorAll('.hl .wd'));
  var box = B ? H.querySelector('.bars') : null, hl = B ? null : H.querySelector('.hl'), scene = B ? null : H.querySelector('.scene');
  var W = 1, SH = 1, items = [], words = [], boxBottom = 0, em = 16;
  var mx = -1e4, my = -1e4, pvx = 0, pvy = 0, lastX = null, lastY = null, lastT = 0, inside = false;
  var par = 0, tilt = 0, gx = 0, gy = 0, open = 0, running = false;

  function hash(i, s) { var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function spring(it, tx, ty) {
    it.vx = (it.vx + (tx - it.ox) * it.k) * it.d; it.ox += it.vx;
    it.vy = (it.vy + (ty - it.oy) * it.k) * it.d; it.oy += it.vy;
    return Math.abs(it.vx) + Math.abs(it.vy) > .02 || Math.abs(tx - it.ox) + Math.abs(ty - it.oy) > .08;
  }
  function falloff(dx, dy, R) { var d = Math.sqrt(dx * dx + dy * dy); if (d >= R) return 0; var f = 1 - d / R; return f * f * (3 - 2 * f); }

  function measure() {
    els.forEach(function (el) { el.style.transform = ''; });
    wds.forEach(function (w) { w.lastElementChild.style.transform = ''; w.lastElementChild.style.visibility = ''; w.firstElementChild.style.clipPath = ''; });
    if (scene) scene.style.transform = '';
    var s = stage.getBoundingClientRect(); W = s.width; SH = s.height; if (hl) em = parseFloat(getComputedStyle(hl).fontSize) || 16;
    if (box) { var bb = box.getBoundingClientRect(); boxBottom = bb.bottom - s.top; }
    var rows = {};
    items = els.map(function (el, i) {
      var r = el.getBoundingClientRect(), row = Math.round((r.top - s.top) / 4);
      if (!(row in rows)) rows[row] = Object.keys(rows).length;
      var it = items[i] || { ox: 0, oy: 0, vx: 0, vy: 0 };
      it.el = el; it.x = r.left - s.left; it.y = r.top - s.top; it.w = r.width; it.h = r.height;
      it.k = .05 + hash(i, 1) * .07; it.d = .80 + hash(i, 2) * .08; it.a = .55 + hash(i, 3) * .9;
      it.sg = hash(i, 4) < .5 ? -1 : 1;
      it.sky = B ? parseFloat(el.getAttribute('data-sky')) || 0 : 0;
      return it;
    });
    var order = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });
    items.forEach(function (it, i) {
      var r = order.indexOf(Math.round(it.y / 4)), cx = (it.x + it.w / 2) / W;
      it.dir = B ? 0 : 1;                         // replies leave to the right
      it.delay = B ? clamp(Math.abs(cx - .5) * .5 + hash(i, 5) * .12, 0, .4) : clamp(.12 + r * .12 + (1 - cx) * .1 + hash(i, 5) * .06, 0, .55);
    });
    // the cards: each at its own depth, placed and sized so that from straight on it covers its word exactly
    words = wds.map(function (el, i) {
      var d = el.lastElementChild.getBoundingClientRect(), it = words[i] || { oz: 0, vz: 0 };
      it.el = el; it.tx = el.firstElementChild; it.dash = el.lastElementChild;
      it.cx = d.left - s.left + d.width / 2 - W / 2; it.cy = d.top - s.top + d.height / 2 - SH / 2;
      it.z0 = 140 + hash(i, 7) * 250;
      it.k = .05 + hash(i, 8) * .04; it.d = .84 + hash(i, 9) * .05;
      it.delay = i / wds.length * .62;            // in reading order, the coral one last
      return it;
    });
  }

  function progress() {
    var r = H.getBoundingClientRect(), span = H.offsetHeight - innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  function tick() {
    open = progress();
    var moving = false;
    var parT = inside ? (mx / W - .5) : gx, tT = inside ? (my / SH - .5) : gy;
    par += (parT - par) * .07; tilt += (tT - tilt) * .07;
    if (Math.abs(parT - par) + Math.abs(tT - tilt) > .0008) moving = true;
    pvx *= .9; pvy *= .9; if (Math.abs(pvx) + Math.abs(pvy) > .05) moving = true;
    H.classList.toggle('open', open > .55);

    if (scene) {
      scene.style.transform = 'rotateX(' + (tilt * -12).toFixed(3) + 'deg) rotateY(' + (par * 22).toFixed(3) + 'deg)';
      scene.style.setProperty('--d', ease(clamp(open / .85, 0, 1)).toFixed(4));
    }

    // the cards: write every transform first, then read where each landed against its word, then open the words
    var j, w;
    for (j = 0; j < words.length; j++) {
      w = words[j];
      var lift = 0;
      if (inside) lift = 340 * falloff(w.cx + W / 2 - mx, (w.cy + SH / 2 - my) * 1.6, Math.max(170, W * .17));
      w.vz = (w.vz + (lift - w.oz) * w.k) * w.d; w.oz += w.vz;
      if (Math.abs(w.vz) > .02 || Math.abs(lift - w.oz) > .1) moving = true;
      w.e = ease(clamp((open - w.delay) / .3, 0, 1));
      var z = w.z0 + w.oz, k = (P - z) / P;
      w.dash.style.transform = 'translate3d(' + (-w.cx * z / P).toFixed(2) + 'px,' + (-w.cy * z / P).toFixed(2) + 'px,' + z.toFixed(1) +
        'px) rotateX(' + (w.e * 90).toFixed(2) + 'deg) scale(' + k.toFixed(4) + ')';
      w.dash.style.visibility = w.e > .985 ? 'hidden' : '';             // edge-on, a card is gone, not a hairline
    }
    for (j = 0; j < words.length; j++) { w = words[j]; w.dr = w.dash.getBoundingClientRect(); w.wr = w.tx.getBoundingClientRect(); }
    for (j = 0; j < words.length; j++) {
      w = words[j]; var ww = w.wr.width || 1;
      var a = clamp(w.dr.left - w.wr.left, 0, ww), b = clamp(w.dr.right - w.wr.left, 0, ww);
      a = Math.max(a, w.e * ww);                                        // turning edge-on, the word comes in behind it
      if (w.e > .995) { a = ww; b = ww; }
      if (a < em * .22) a = 0; if (ww - b < em * .22) b = ww;          // a glimpse is a piece of a letter, never a speck
      if (b <= a) b = a;
      var A = (a / ww * 100).toFixed(2), Bp = (b / ww * 100).toFixed(2);
      w.tx.style.clipPath = 'polygon(0 -40%,' + A + '% -40%,' + A + '% 140%,0 140%,0 -40%,' + Bp + '% -40%,100% -40%,100% 140%,' + Bp + '% 140%,' + Bp + '% -40%)';
    }

    // the replies (A) leave to the right; the rhythm wall (B) scatters for the cursor and comes down into the city
    var R = Math.max(150, W * .11);
    for (var i = 0; i < items.length; i++) {
      var it = items[i], tx2 = 0, ty2 = 0;
      if (B && inside) {
        var ddx = it.x + it.w / 2 - mx, ddy = it.y + it.h / 2 - my, g = falloff(ddx, ddy * .28, R);
        if (g) { tx2 = g * ((ddx >= 0 ? 1 : -1) * W * .012 * it.a + pvx * .8); ty2 = g * (it.sg * it.h * .3 * it.a + pvy * 1.4 * it.a); }
      }
      if (spring(it, tx2, ty2)) moving = true;
      var e2 = ease(clamp((open - it.delay) / .45, 0, 1));
      if (B) {
        var p = par * -16, T = it.y, h = it.h, sh = it.sky * SH * .19, T2 = boxBottom - sh;
        var t = T + (T2 - T) * e2, hh = h + (sh - h) * e2;
        it.el.style.transform = 'translate3d(' + (it.ox + p).toFixed(1) + 'px,' + (t - T + it.oy * (1 - e2)).toFixed(1) + 'px,0) scale(1,' + (hh / h).toFixed(4) + ')';
      } else {
        var go = e2 * (W - it.x + 12);                                    // exactly off the right edge
        it.el.style.transform = 'translate3d(' + go.toFixed(1) + 'px,0,0)';
      }
    }
    if (moving) requestAnimationFrame(tick); else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

  function point(x, y) {
    var s = stage.getBoundingClientRect(), nx = x - s.left, ny = y - s.top, now = performance.now();
    if (lastX !== null && now - lastT < 120) { pvx = pvx * .5 + (nx - lastX) * .5; pvy = pvy * .5 + (ny - lastY) * .5; }
    lastX = nx; lastY = ny; lastT = now; mx = nx; my = ny;
    inside = nx >= 0 && ny >= 0 && nx <= s.width && ny <= s.height; kick();
  }
  stage.addEventListener('pointermove', function (e) { if (e.pointerType !== 'touch') point(e.clientX, e.clientY); });
  stage.addEventListener('pointerleave', function () { inside = false; lastX = null; kick(); });
  addEventListener('scroll', kick, { passive: true });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); kick(); }, 120); });
  // Android phones: tilting the phone moves the line of sight (iOS asks permission first, so it keeps the scroll only)
  if (!B && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function' &&
      matchMedia('(pointer: coarse)').matches) {
    var b0 = null;
    addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return; if (b0 === null) b0 = e.beta;
      var nx = clamp(e.gamma / 50, -.5, .5), ny = clamp((e.beta - b0) / 50, -.5, .5);
      if (Math.abs(nx - gx) + Math.abs(ny - gy) > .01) { gx = nx; gy = ny; kick(); }
    });
  }

  function start() { measure(); H.classList.add('live'); kick(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
