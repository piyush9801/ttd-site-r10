/* The Talent Dept. · round 10 hero.
   A: the sentence as Line of Sight. Each word stands behind one Ink dash of its own length. Move across it and the
   dashes near the cursor slide aside, each at its own pace and by its own amount (a quick movement sends them further),
   and the words show where they stood. Scroll and the dashes give way in reading order, the coral one last, into the
   full stop. The Draft replies, set in the pauses between the lines, sit deeper: they drift more with the cursor and
   leave to the right.
   ?hero=b: the rhythm wall, which comes down into the city.
   Nothing moves on its own: when the cursor rests, everything settles and the loop stops. Touch: scrolling opens it;
   dragging a finger across it moves the dashes too. */
(function () {
  var H = document.querySelector('.hero4'), root = document.documentElement;
  if (!H || root.classList.contains('still')) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var B = root.classList.contains('hero-b');
  var stage = H.querySelector('.stage');
  var els = [].slice.call(H.querySelectorAll(B ? '.bars i' : '.far i'));
  var wds = B ? [] : [].slice.call(H.querySelectorAll('.hl .wd'));
  var box = B ? H.querySelector('.bars') : null, hl = B ? null : H.querySelector('.hl');
  var W = 1, SH = 1, items = [], words = [], boxBottom = 0, em = 16;
  var mx = -1e4, my = -1e4, pvx = 0, pvy = 0, lastX = null, lastY = null, lastT = 0, inside = false;
  var par = 0, open = 0, running = false;

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
    wds.forEach(function (w) { w.lastElementChild.style.transform = ''; }); if (hl) hl.style.transform = '';
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
    words = wds.map(function (el, i) {
      var r = el.getBoundingClientRect(), it = words[i] || { ox: 0, oy: 0, vx: 0, vy: 0 };
      it.el = el; it.tx = el.firstElementChild; it.dash = el.lastElementChild;
      it.x = r.left - s.left; it.y = r.top - s.top; it.w = r.width; it.h = r.height;
      it.k = .045 + hash(i, 7) * .05; it.d = .82 + hash(i, 8) * .06; it.a = .6 + hash(i, 9) * .5;
      it.sg = hash(i, 10) < .5 ? -1 : 1;
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
    var moving = false, parT = inside ? (mx / W - .5) : 0;
    par += (parT - par) * .08; if (Math.abs(parT - par) > .0005) moving = true;
    pvx *= .9; pvy *= .9; if (Math.abs(pvx) + Math.abs(pvy) > .05) moving = true;
    H.classList.toggle('open', open > .55);

    if (hl) hl.style.transform = 'translate3d(' + (par * -9).toFixed(1) + 'px,0,0)';
    // the statement: a dash slides aside and its word shows in the room it leaves
    for (var j = 0; j < words.length; j++) {
      var w = words[j], tx = 0, ty = 0;
      if (inside) {
        var dx = w.x + w.w / 2 - mx, f = falloff(dx, (w.y + w.h / 2 - my) * 1.9, Math.max(150, W * .15));
        if (f) {
          tx = f * ((dx >= 0 ? 1 : -1) * w.w * .62 * w.a + pvx * 1.6);
          tx = clamp(tx, -w.w * 1.1, w.w * 1.1);
          ty = f * w.sg * w.h * .06;
        }
      }
      if (spring(w, tx, ty)) moving = true;
      var e = ease(clamp((open - w.delay) / .3, 0, 1)), L = w.ox + e * w.w, len = (1 - e) * w.w;
      w.dash.style.transform = 'translate3d(' + L.toFixed(1) + 'px,' + w.oy.toFixed(1) + 'px,0) scaleX(' + (1 - e).toFixed(4) + ')';
      var a = clamp(L / w.w, 0, 1) * 100, b = clamp((L + len) / w.w, 0, 1) * 100;
      if (a * w.w / 100 < em * .22) a = 0; if ((100 - b) * w.w / 100 < em * .22) b = 100;   // a glimpse is a piece of a letter, never a speck
      w.tx.style.clipPath = 'polygon(0 -40%,' + a + '% -40%,' + a + '% 140%,0 140%,0 -40%,' + b + '% -40%,100% -40%,100% 140%,' + b + '% 140%,' + b + '% -40%)';
    }

    // the replies (A) or the rhythm wall (B)
    var R = Math.max(150, W * (B ? .11 : .2));
    for (var i = 0; i < items.length; i++) {
      var it = items[i], tx2 = 0, ty2 = 0;
      if (inside) {
        var ddx = it.x + it.w / 2 - mx, ddy = it.y + it.h / 2 - my;
        var g = B ? falloff(ddx, ddy * .28, R) : falloff(ddx, ddy * 1.6, R);
        if (g) {
          var side = ddx >= 0 ? 1 : -1;
          if (B) { tx2 = g * (side * W * .012 * it.a + pvx * .8); ty2 = g * (it.sg * it.h * .3 * it.a + pvy * 1.4 * it.a); }
          else { tx2 = g * (side * W * .05 * it.a + pvx * 2 * it.a); ty2 = g * (ddy >= 0 ? 1 : -1) * it.h * .5 * it.a; }
        }
      }
      if (spring(it, tx2, ty2)) moving = true;
      var e2 = ease(clamp((open - it.delay) / .45, 0, 1)), p = par * (B ? -16 : 18);
      if (B) {
        var T = it.y, h = it.h, sh = it.sky * SH * .26, T2 = boxBottom - sh;
        var t = T + (T2 - T) * e2, hh = h + (sh - h) * e2;
        it.el.style.transform = 'translate3d(' + (it.ox + p).toFixed(1) + 'px,' + (t - T + it.oy * (1 - e2)).toFixed(1) + 'px,0) scale(1,' + (hh / h).toFixed(4) + ')';
      } else {
        var go = e2 * (it.dir > 0 ? W - it.x + 12 : -(it.x + it.w + 12));   // exactly off its own edge
        it.el.style.transform = 'translate3d(' + (it.ox + p + go).toFixed(1) + 'px,' + it.oy.toFixed(1) + 'px,0)';
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
  stage.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) point(t.clientX, t.clientY); }, { passive: true });
  stage.addEventListener('touchend', function () { inside = false; lastX = null; kick(); }, { passive: true });
  addEventListener('scroll', kick, { passive: true });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); kick(); }, 120); });

  function start() { measure(); H.classList.add('live'); kick(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
