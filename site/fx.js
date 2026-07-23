/* ============================================================
   Efectos 3D de objetos (independiente del fondo de partículas).
   1) Inclinación 3D de tarjetas al pasar el mouse (delegación ->
      también cubre tarjetas inyectadas por script.js).
   2) Parallax 3D del lockup del hero según el mouse.
   3) Objetos 3D decorativos girando (anillos / cuadros wireframe)
      inyectados SOLO en las secciones oscuras (zona con partículas).
      Animados con Web Animations API -> giran siempre (ignoran el
      "reduce motion" del SO).
   ============================================================ */
(function () {
  /* ---------- 1) Tilt 3D de tarjetas ---------- */
  var SEL = [
    '.price-card', '.enroll-card', '.about-media', '.perk', '.spk-card',
    '.tl-card', '.activity', '.ally-card', '.audience-card', '.venue-card', '.stat'
  ].join(',');
  var MAX = 9, active = null;

  function reset(el) {
    if (!el) return;
    el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
    el.style.transform = '';
  }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (el !== active) { reset(active); active = el; if (el) el.style.willChange = 'transform'; }
    if (!el) return;
    var r = el.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transition = 'transform .08s linear';
    el.style.transform =
      'perspective(820px) rotateY(' + (px * MAX * 2).toFixed(2) + 'deg) rotateX(' +
      (-py * MAX * 2).toFixed(2) + 'deg) translateZ(10px)';
  }, { passive: true });
  window.addEventListener('pointerleave', function () { reset(active); active = null; }, { passive: true });
  window.addEventListener('scroll', function () { if (active) { reset(active); active = null; } }, { passive: true });

  /* ---------- 2) Parallax 3D del hero lockup ---------- */
  var lockup = document.querySelector('.hero-lockup');
  if (lockup) {
    lockup.style.transition = 'transform .25s ease-out';
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var px = e.clientX / window.innerWidth - 0.5;
      var py = e.clientY / window.innerHeight - 0.5;
      lockup.style.transform =
        'perspective(900px) rotateY(' + (px * 10).toFixed(2) + 'deg) rotateX(' +
        (-py * 7).toFixed(2) + 'deg) translateZ(24px)';
    }, { passive: true });
  }

  /* ---------- 3) Objetos 3D decorativos en zonas oscuras ---------- */
  function make(cls, size, pos) {
    var el = document.createElement('div');
    el.className = 'fx3d ' + cls;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    for (var k in pos) el.style[k] = pos[k];
    el.style.opacity = '0';
    return el;
  }
  function spin(el, dur, rev, opacity) {
    el.animate(
      [{ transform: 'perspective(760px) rotateX(0deg) rotateY(0deg)' },
       { transform: 'perspective(760px) rotateX(360deg) rotateY(360deg)' }],
      { duration: dur, iterations: Infinity, easing: 'linear', direction: rev ? 'reverse' : 'normal' }
    );
    el.animate([{ opacity: 0 }, { opacity: opacity }], { duration: 1200, fill: 'forwards', easing: 'ease-out' });
  }

  var darks = document.querySelectorAll('.section-dark');
  darks.forEach(function (sec, i) {
    var cont = getComputedStyle(sec);
    if (cont.position === 'static') sec.style.position = 'relative';
    var even = i % 2 === 0;
    // objeto grande esquina superior
    var a = make(even ? 'ring' : 'square', 200 + (i % 3) * 40,
      even ? { top: '6%', right: '5%' } : { top: '10%', left: '4%' });
    // objeto chico esquina opuesta inferior
    var b = make(even ? 'square' : 'ring', 120 + (i % 2) * 30,
      even ? { bottom: '8%', left: '6%' } : { bottom: '6%', right: '7%' });
    sec.appendChild(a); sec.appendChild(b);
    spin(a, 22000 + i * 3000, even, 0.5);
    spin(b, 16000 + i * 2000, !even, 0.42);
  });
})();
