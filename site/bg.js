/* ============================================================
   Fondo 3D creativo dirigido por SCROLL (canvas + rAF).
   Capas:
   - Nebulosa de niebla a la deriva (atmosfera de profundidad).
   - Campo de particulas en warp: scroll -> camara avanza en Z.
   - Estelas reactivas a la velocidad de scroll.
   - Pozo de gravedad del cursor (las particulas se doblan).
   - Cometas ocasionales con cola.
   - Ondas de energia al hacer click / tap.
   - Tinte que vira hacia violeta al bajar en la pagina.
   Corre siempre (ignora cache CSS y "reduce motion" del SO).
   ============================================================ */
(function () {
  var canvas = document.getElementById('bg-fx');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  var NEAR = 0.15, FAR = 3.0, SPAN = FAR - NEAR;
  var GOLD = [232, 180, 71], BLUE = [84, 116, 214], VIOLET = [150, 92, 220];
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t | 0, a[1] + (b[1] - a[1]) * t | 0, a[2] + (b[2] - a[2]) * t | 0]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  // ---- Campo de particulas ----
  function build() {
    var pts = [], N = W < 640 ? 150 : (W < 1100 ? 240 : 340);
    for (var i = 0; i < N; i++) pts.push({
      x: (Math.random() * 2 - 1) * 1.4, y: (Math.random() * 2 - 1) * 1.4,
      z0: NEAR + Math.random() * SPAN, tw: Math.random() * 6.283
    });
    return pts;
  }
  var points = build();
  window.addEventListener('resize', function () { points = build(); });

  // ---- Nebulosa ----
  var neb = [
    { c: GOLD, x: 0.28, y: 0.30, r: 0.85, ax: 0.06, ay: 0.05, sx: 0.05, sy: 0.04, a: 0.10 },
    { c: BLUE, x: 0.74, y: 0.66, r: 0.95, ax: 0.07, ay: 0.06, sx: 0.04, sy: 0.06, a: 0.12 },
    { c: VIOLET, x: 0.52, y: 0.80, r: 0.80, ax: 0.08, ay: 0.05, sx: 0.03, sy: 0.05, a: 0.09 }
  ];

  // ---- Cursor ----
  var tmx = 0, tmy = 0, mx = 0, my = 0;          // parallax normalizado
  var curX = -1e4, curY = -1e4, cX = curX, cY = curY;   // posicion en pixeles
  var hasCursor = false;
  window.addEventListener('pointermove', function (e) {
    tmx = (e.clientX / W - 0.5) * 2; tmy = (e.clientY / H - 0.5) * 2;
    curX = e.clientX; curY = e.clientY; hasCursor = true;
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    ripples.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
    for (var k = 0; k < 6; k++) spawnComet(e.clientX, e.clientY, true);
  }, { passive: true });

  // ---- Cometas ----
  var comets = [];
  function spawnComet(x, y, burst) {
    var ang, sp;
    if (burst) { ang = Math.random() * 6.283; sp = 260 + Math.random() * 240; }
    else { ang = Math.PI * (0.15 + Math.random() * 0.35); sp = 340 + Math.random() * 260; x = Math.random() * W; y = -20; }
    comets.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, c: Math.random() < 0.5 ? GOLD : mix(BLUE, VIOLET, 0.5) });
  }
  var cometTimer = 0;

  // ---- Ondas (click) ----
  var ripples = [];

  // ---- Scroll ----
  function scrollTop() { return window.pageYOffset || document.documentElement.scrollTop || 0; }
  function scrollProg() {
    var max = (document.documentElement.scrollHeight - H);
    return max > 0 ? Math.min(1, scrollTop() / max) : 0;
  }
  var travel = 0, prevTravel = 0, lastScroll = 0, scrollVel = 0;
  var SCROLL_K = 0.0022, DRIFT = 0.16;
  function wrap(z) { return ((z - NEAR) % SPAN + SPAN) % SPAN + NEAR; }

  var start = performance.now(), last = start;
  function frame(now) {
    var t = (now - start) / 1000;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    cX += (curX - cX) * 0.18; cY += (curY - cY) * 0.18;

    var st = scrollTop();
    var instVel = Math.abs(st - lastScroll); lastScroll = st;
    scrollVel += (instVel - scrollVel) * 0.12;
    var streakBoost = 1 + Math.min(scrollVel * 0.03, 7);

    var target = st * SCROLL_K + t * DRIFT;
    prevTravel = travel; travel += (target - travel) * 0.16;
    var dTravel = travel - prevTravel;

    var prog = scrollProg();
    var nearCol = mix(GOLD, VIOLET, prog * 0.55);   // vira a violeta al bajar
    var farCol = mix(BLUE, VIOLET, prog * 0.30);

    // Fondo base
    var base = ctx.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, '#0a0f22');
    base.addColorStop(0.55, prog > 0.5 ? '#120e30' : '#0e1430');
    base.addColorStop(1, '#080c1c');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    var mind = Math.min(W, H);

    // Nebulosa
    for (var n = 0; n < neb.length; n++) {
      var b = neb[n];
      var gx = (b.x + b.ax * Math.sin(t * b.sx + n)) * W;
      var gy = (b.y + b.ay * Math.cos(t * b.sy + n)) * H;
      var gr = b.r * mind;
      var rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, rgba(b.c, b.a)); rg.addColorStop(1, rgba(b.c, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }

    // Campo de particulas
    var ccx = W / 2, ccy = H * 0.5, focal = mind * 0.9;
    var swirl = travel * 0.06 + t * 0.02, cs = Math.cos(swirl), sn = Math.sin(swirl);
    var GRAV_R = mind * 0.26, GRAV_R2 = GRAV_R * GRAV_R;

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var z = wrap(p.z0 - travel), zP = wrap(p.z0 - prevTravel);
      var rx = p.x * cs - p.y * sn, ry = p.x * sn + p.y * cs;
      var s = focal / z, sP = focal / zP;
      var par = 1 - (z - NEAR) / SPAN;
      var sx = ccx + rx * s + mx * 60 * par;
      var sy = ccy + ry * s + my * 60 * par;

      // gravedad del cursor
      if (hasCursor) {
        var dxc = cX - sx, dyc = cY - sy, dc2 = dxc * dxc + dyc * dyc;
        if (dc2 < GRAV_R2) {
          var pull = (1 - Math.sqrt(dc2) / GRAV_R) * 0.35;
          sx += dxc * pull; sy += dyc * pull;
        }
      }

      var dn = par, col = mix(farCol, nearCol, dn);
      var tw = 0.72 + 0.28 * Math.sin(t * 2 + p.tw);
      var rad = (0.6 + dn * 3.4) * tw;
      var alpha = (0.14 + dn * 0.72) * tw;

      if (Math.abs(z - zP) < SPAN * 0.5 && Math.abs(dTravel) > 0.0004) {
        var pxs = ccx + rx * sP + mx * 60 * par, pys = ccy + ry * sP + my * 60 * par;
        var ex = sx + (sx - pxs) * (streakBoost - 1), ey = sy + (sy - pys) * (streakBoost - 1);
        ctx.strokeStyle = rgba(col, (alpha * 0.5).toFixed(3));
        ctx.lineWidth = Math.max(0.6, rad * 0.7);
        ctx.beginPath(); ctx.moveTo(pxs, pys); ctx.lineTo(ex, ey); ctx.stroke();
      }

      var grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad * 3.2);
      grd.addColorStop(0, rgba(col, alpha.toFixed(3))); grd.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(sx, sy, rad * 3.2, 0, 6.283); ctx.fill();
    }

    // Cometas
    cometTimer += dt;
    if (cometTimer > 2.4 && Math.random() < 0.5) { cometTimer = 0; spawnComet(); }
    for (var c = comets.length - 1; c >= 0; c--) {
      var cm = comets[c];
      cm.x += cm.vx * dt; cm.y += cm.vy * dt; cm.life -= dt * 0.6;
      if (cm.life <= 0 || cm.x < -60 || cm.x > W + 60 || cm.y > H + 60) { comets.splice(c, 1); continue; }
      var tx = cm.x - cm.vx * 0.06, ty = cm.y - cm.vy * 0.06;
      var lg = ctx.createLinearGradient(tx, ty, cm.x, cm.y);
      lg.addColorStop(0, rgba(cm.c, 0)); lg.addColorStop(1, rgba(cm.c, 0.7 * cm.life));
      ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(cm.x, cm.y); ctx.stroke();
      var hg = ctx.createRadialGradient(cm.x, cm.y, 0, cm.x, cm.y, 8);
      hg.addColorStop(0, rgba(cm.c, 0.9 * cm.life)); hg.addColorStop(1, rgba(cm.c, 0));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cm.x, cm.y, 8, 0, 6.283); ctx.fill();
    }

    // Ondas de click
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r];
      rp.r += (mind * 0.5 - rp.r) * 0.06 + 2; rp.life -= dt * 0.7;
      if (rp.life <= 0) { ripples.splice(r, 1); continue; }
      ctx.strokeStyle = rgba(GOLD, (0.35 * rp.life).toFixed(3));
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = rgba(BLUE, (0.22 * rp.life).toFixed(3));
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r * 0.6, 0, 6.283); ctx.stroke();
    }

    // Resplandor del cursor
    if (hasCursor) {
      var cg = ctx.createRadialGradient(cX, cY, 0, cX, cY, mind * 0.14);
      cg.addColorStop(0, rgba(GOLD, 0.10)); cg.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
