/* ==========================================================
   I Congreso Internacional de Derecho Procesal Contemporáneo
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Data ---------- */
  const SPEAKERS = [
    { n: "Dr. Abel Augusto Zamorano", c: "Panamá", f: "🇵🇦", img: "spk-zamorano.jpg", day: 1, t: "Conferencia inaugural" },
    { n: "Dr. José Neyra Flores", c: "Perú", f: "🇵🇪", img: "spk-neyra.jpg", day: 1, t: "Ciencia, prueba testimonial y pericial en el proceso penal" },
    { n: "Dr. Jordi Nieva Fenoll", c: "España", f: "🇪🇸", img: "spk-nieva.jpg", day: 1, t: "¿Tiene sentido aún el proceso penal?" },
    { n: "Dra. Lucía Fernández Ramírez", c: "Uruguay", f: "🇺🇾", img: "spk-fernandez.jpg", day: 1, t: "" },
    { n: "Dr. Gabriel Valentín", c: "Uruguay", f: "🇺🇾", img: "spk-valentin.jpg", day: 1, t: "No todo es cautelar. La importancia de distinguir entre distintas formas de tutela" },
    { n: "Dr. Raymundo Gama Leyva", c: "México", f: "🇲🇽", img: "spk-gama.jpg", day: 1, t: "Restitución internacional de NNA (Convenio de La Haya)" },
    { n: "Dr. Jhony Batalla Mena", c: "Colombia", f: "🇨🇴", img: "spk-batalla.jpg", day: 2, t: "" },
    { n: "Dr. Lorenzo Mateo Bujosa", c: "España", f: "🇪🇸", img: "spk-bujosa.jpg", day: 2, t: "Los procesos colectivos en España" },
    { n: "Dr. Walter Reifarth Muñoz", c: "España", f: "🇪🇸", img: "spk-reifarth.jpg", day: 2, t: "La mediación ambiental" },
    { n: "Dra. Núria Borràs Andrés", c: "España", f: "🇪🇸", img: "spk-borras.jpg", day: 2, t: "" },
    { n: "Dr. Ulises Canosa Suárez", c: "Colombia", f: "🇨🇴", img: "spk-canosa.jpg", day: 2, t: "" },
    { n: "Dr. Manuel Alonso Succari", c: "Panamá", f: "🇵🇦", img: "spk-succari.jpg", day: 2, t: "" },
  ];

  const AGENDA = {
    1: [
      { time: "9:00 – 10:30 AM", title: "Apertura institucional y protocolo inaugural", desc: "Himno, protocolo de salidas de emergencia y palabras de bienvenida." },
      { time: "10:30 – 11:20 AM", title: "Conferencia 1 · Dr. Abel Augusto Zamorano", desc: "Panamá 🇵🇦" },
      { time: "11:20 – 11:35 AM", title: "Coffee Break", brk: true },
      { time: "11:35 AM – 12:25 PM", title: "Conferencia 2 · Dr. José Neyra Flores", desc: "Perú 🇵🇪 — Ciencia, prueba testimonial y pericial en el proceso penal." },
      { time: "12:25 – 2:25 PM", title: "Almuerzo · Lunch talk", brk: true },
      { time: "2:25 – 3:15 PM", title: "Conferencia 3 · Dr. Jordi Nieva Fenoll", desc: "España 🇪🇸 — ¿Tiene sentido aún el proceso penal?" },
      { time: "3:15 – 4:05 PM", title: "Conferencia 4 · Dra. Lucía Fernández", desc: "Uruguay 🇺🇾" },
      { time: "4:05 – 4:20 PM", title: "Coffee Break", brk: true },
      { time: "4:20 – 5:10 PM", title: "Conferencia 5 · Dr. Gabriel Valentín", desc: "Uruguay 🇺🇾 — No todo es cautelar: la importancia de distinguir entre distintas formas de tutela." },
      { time: "5:10 – 6:10 PM", title: "Conferencia 6 · Dr. Raymundo Gama Leyva", desc: "México 🇲🇽 — Procedimiento de restitución internacional de NNA (Convenio de La Haya)." },
    ],
    2: [
      { time: "9:00 – 9:50 AM", title: "Conferencia 1 · Dr. Jhony Batalla Mena", desc: "Colombia 🇨🇴" },
      { time: "9:50 – 10:40 AM", title: "Conferencia 2 · Dr. Lorenzo Mateo Bujosa", desc: "España 🇪🇸 — Los procesos colectivos en España." },
      { time: "10:40 – 10:55 AM", title: "Coffee Break", brk: true },
      { time: "10:55 – 11:45 AM", title: "Conferencia 3 · Dr. Walter Reifarth Muñoz", desc: "España 🇪🇸 — La mediación ambiental." },
      { time: "11:45 AM – 12:35 PM", title: "Conferencia 4 · Dra. Núria Borràs Andrés", desc: "España 🇪🇸" },
      { time: "12:35 – 2:35 PM", title: "Almuerzo · Lunch talk", brk: true },
      { time: "2:35 – 3:25 PM", title: "Conferencia 5 · Dr. Ulises Canosa Suárez", desc: "Colombia 🇨🇴" },
      { time: "3:25 – 4:15 PM", title: "Conferencia 6 · Dr. Manuel Alonso Succari", desc: "Panamá 🇵🇦" },
      { time: "4:15 – 5:15 PM", title: "Ceremonia de clausura", brk: true },
    ],
  };

  const AUDIENCE = [
    { ic: "M12 3 3 8l9 5 9-5-9-5zM3 8v6l9 5 9-5V8", t: "Abogados y litigantes." },
    { ic: "M3 21v-2a4 4 0 0 1 4-4h4M15 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.87M9 7a4 4 0 1 0 0 .01", t: "Jueces, magistrados y funcionarios de la administración de justicia." },
    { ic: "M12 2 2 7l10 5 10-5-10-5zM2 7v10M6 10v6a6 3 0 0 0 12 0v-6", t: "Fiscales y miembros del Ministerio Público." },
    { ic: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z", t: "Docentes e investigadores del área jurídica." },
    { ic: "M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5", t: "Estudiantes de pregrado y posgrado en Derecho." },
    { ic: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", t: "Árbitros, conciliadores y profesionales de la resolución de conflictos." },
  ];

  const WHY = [
    "Escucha de primera mano a doce ponentes de seis países, con investigación y jurisprudencia reciente sobre el proceso.",
    "Compara cómo se resuelven los mismos problemas —prueba, cautelares, procesos colectivos— en distintos ordenamientos.",
    "Conversa con magistrados, litigantes y docentes en los espacios de café, almuerzo y clausura.",
    "Llévate el certificado de participación y las memorias digitales de las dos jornadas.",
  ];

  const PERKS = [
    { ic: "M20 7 9 18l-5-5", t: "Kit académico presencial" },
    { ic: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1", t: "Certificado de participación" },
    { ic: "M4 4h16v12H4zM2 20h20M8 8h8M8 12h5", t: "Memorias digitales del evento" },
  ];

  const ACTIVITIES = [
    { img: "act-conferencias.svg", h: "Conferencias magistrales", p: "Doce ponencias sobre prueba penal, tutela cautelar, procesos colectivos, mediación ambiental y restitución internacional de menores." },
    { img: "act-invitados.svg", h: "Ponentes de seis países", p: "Juristas y profesores de Panamá, Perú, España, Uruguay, México y Colombia exponen y contrastan su experiencia procesal." },
    { img: "act-networking.svg", h: "Espacios para conversar", p: "Pausas de café, almuerzo y clausura pensados para el intercambio entre abogados, jueces, docentes y estudiantes." },
  ];

  const ALLIES = [
    { logo: "logo-mercosur.png", h: "Cámara de Comercio Panamá–Mercosur", p: "Impulsa las relaciones comerciales, empresariales y académicas entre Panamá y los países del MERCOSUR." },
    { logo: "logo-mmh.png", dark: true, h: "María Morales, Henao Abogados & Asociados", p: "Firma de asesoría y representación en derecho civil, penal, administrativo y procesos de extinción de dominio." },
    { logo: "logo-atlapa.png", h: "Centro de Convenciones ATLAPA", p: "Sede oficial del Congreso y uno de los principales recintos para eventos internacionales en Panamá." },
    { logo: "logo-isi.png", h: "Instituto Superior de Ingeniería (ISI) · Panamá", p: "Institución con más de 18 años formando profesionales en Panamá." },
  ];

  /* ---------- Render helpers ---------- */
  const svg = (p) => `<svg viewBox="0 0 24 24">${p.split("M").filter(Boolean).map(d => `<path d="M${d}"/>`).join("")}</svg>`;

  function renderSpeakers() {
    const g = $("#speakersGrid");
    g.innerHTML = SPEAKERS.map(s => `
      <article class="spk-card" data-day="${s.day}">
        <div class="spk-photo">
          <img src="assets/img/${s.img}" alt="${s.n}" loading="lazy" />
          <span class="spk-flag">${s.f}</span>
          <span class="spk-day">Día ${s.day}</span>
        </div>
        <div class="spk-body">
          <h3 class="spk-name">${s.n}</h3>
          <p class="spk-country">${s.c}</p>
          ${s.t ? `<p class="spk-topic">${s.t}</p>` : ""}
        </div>
      </article>`).join("");
    g.classList.add("stagger");
  }

  function renderAgenda() {
    [1, 2].forEach(d => {
      $("#agenda" + d).innerHTML = AGENDA[d].map(it => `
        <li class="tl-item${it.brk ? " is-break" : ""}">
          <span class="tl-time">${it.time}</span>
          <div class="tl-card">
            ${it.brk ? `<span class="tl-tag">Pausa</span>` : ""}
            <p class="tl-title">${it.title}</p>
            ${it.desc ? `<p class="tl-desc">${it.desc}</p>` : ""}
          </div>
        </li>`).join("");
    });
  }

  function renderList() {
    $("#audienceGrid").innerHTML = AUDIENCE.map(a => `
      <div class="aud-card"><span class="aud-ic">${svg(a.ic)}</span><p>${a.t}</p></div>`).join("");
    $("#audienceGrid").classList.add("stagger");

    $("#whyGrid").innerHTML = WHY.map((w, i) => `
      <div class="why-card"><span class="why-num">0${i + 1}</span><p>${w}</p></div>`).join("");
    $("#whyGrid").classList.add("stagger");

    $("#perksGrid").innerHTML = PERKS.map(p => `
      <div class="perk">${svg(p.ic)}<span>${p.t}</span></div>`).join("");

    $("#activitiesGrid").innerHTML = ACTIVITIES.map(a => `
      <article class="act-card"><div class="act-ic"><img src="assets/img/${a.img}" alt="${a.h}" loading="lazy" /></div>
        <div class="act-body"><h3>${a.h}</h3><p>${a.p}</p></div></article>`).join("");
    $("#activitiesGrid").classList.add("stagger");

    $("#alliesGrid").innerHTML = ALLIES.map(a => `
      <div class="ally-card">
        <span class="ally-logo"><img src="assets/img/${a.logo}" alt="${a.h}" class="${a.dark ? "on-dark" : ""}" loading="lazy" /></span>
        <div class="ally-info"><h3>${a.h}</h3><p>${a.p}</p></div>
      </div>`).join("");
    $("#alliesGrid").classList.add("stagger");
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal, .stagger, .reveal-left, .reveal-right, .reveal-zoom").forEach(el => io.observe(el));
  }

  /* ---------- Count up ---------- */
  function initCounters() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, target = +el.dataset.count, dur = 1400, t0 = performance.now();
        const tick = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    $$("[data-count]").forEach(el => io.observe(el));
  }

  /* ---------- Countdown ---------- */
  function initCountdown() {
    const target = new Date("2026-09-25T09:00:00-05:00").getTime();
    const map = { days: $('[data-cd="days"]'), hours: $('[data-cd="hours"]'), mins: $('[data-cd="mins"]'), secs: $('[data-cd="secs"]') };
    const pad = (n) => String(Math.max(0, n)).padStart(2, "0");
    function upd() {
      const diff = target - Date.now();
      if (diff <= 0) { $("#countdown").innerHTML = '<div class="cd-item" style="min-width:auto;padding:14px 26px"><span class="cd-num">¡Es hoy!</span></div>'; return; }
      const s = Math.floor(diff / 1000);
      map.days.textContent = pad(Math.floor(s / 86400));
      map.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      map.mins.textContent = pad(Math.floor((s % 3600) / 60));
      map.secs.textContent = pad(s % 60);
      map.secs.classList.add("tick");
      setTimeout(() => map.secs.classList.remove("tick"), 150);
    }
    upd();
    setInterval(upd, 1000);
  }

  /* ---------- Header / scrollspy ---------- */
  function initHeader() {
    const header = $("#header"), toTop = $("#toTop");
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("scrolled", y > 60);
      toTop.classList.toggle("show", y > 700);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    const links = $$(".nav-links a:not(.nav-cta)");
    const sections = links.map(a => $(a.getAttribute("href"))).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + id));
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(s => spy.observe(s));
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    const toggle = $("#navToggle"), nav = $("#navLinks");
    const close = () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach(a => a.addEventListener("click", close));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    $$(".chip", $("#spkFilter")).forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".chip", $("#spkFilter")).forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        const d = btn.dataset.day;
        $$(".spk-card").forEach(card => card.classList.toggle("hide", d !== "all" && card.dataset.day !== d));
      });
    });
    $$(".agenda-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        $$(".agenda-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const d = tab.dataset.agenda;
        $$(".agenda-panel").forEach(p => p.classList.toggle("hidden", p.dataset.panel !== d));
      });
    });
  }

  /* ---------- Smooth anchor with header offset ---------- */
  function initAnchors() {
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id === "#" || id.length < 2) return;
        const el = $(id);
        if (!el) return;
        e.preventDefault();
        const y = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  /* ---------- Scroll progress ---------- */
  function initProgress() {
    const bar = $("#scrollProgress");
    const upd = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.width = (p * 100) + "%";
    };
    upd();
    window.addEventListener("scroll", upd, { passive: true });
  }

  const reduced = () => window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---------- Hero particles (gold network) ---------- */
  function initHeroCanvas() {
    const c = $("#heroCanvas");
    if (!c || reduced()) return;
    const ctx = c.getContext("2d");
    let w, h, dots, raf;
    function size() {
      w = c.width = c.offsetWidth * devicePixelRatio;
      h = c.height = c.offsetHeight * devicePixelRatio;
      const count = Math.min(70, Math.floor(w / 40));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: (Math.random() * 1.6 + 0.4) * devicePixelRatio,
        vx: (Math.random() - 0.5) * 0.15 * devicePixelRatio,
        vy: (Math.random() - 0.5) * 0.15 * devicePixelRatio,
        a: Math.random() * 0.5 + 0.2,
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(246,207,107,${d.a})`;
        ctx.fill();
      }
      for (let i = 0; i < dots.length; i++)
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130 * devicePixelRatio) {
            ctx.strokeStyle = `rgba(232,180,71,${0.08 * (1 - dist / (130 * devicePixelRatio))})`;
            ctx.lineWidth = devicePixelRatio * 0.6;
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      raf = requestAnimationFrame(draw);
    }
    size(); draw();
    window.addEventListener("resize", () => { cancelAnimationFrame(raf); size(); draw(); });
  }

  /* ---------- Hero depth on scroll (fade + drift) ---------- */
  function initHeroScroll() {
    const content = $(".hero-content"), canvas = $(".hero-canvas");
    if (!content || reduced()) return;
    let ticking = false;
    const upd = () => {
      const y = window.scrollY, vh = window.innerHeight;
      if (y <= vh) {
        content.style.transform = `translateY(${(y * 0.16).toFixed(1)}px)`;
        content.style.opacity = String(Math.max(0, 1 - y / (vh * 0.8)));
        if (canvas) canvas.style.transform = `translateY(${(y * 0.32).toFixed(1)}px)`;
      }
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(upd); ticking = true; } }, { passive: true });
    upd();
  }

  /* ---------- Image parallax on scroll ---------- */
  function initImgParallax() {
    const els = $$("[data-parallax]");
    if (!els.length || reduced()) return;
    let ticking = false;
    const upd = () => {
      const vh = window.innerHeight;
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const factor = parseFloat(el.dataset.parallax) || 0.1;
        const off = ((r.top + r.height / 2) - vh / 2) * -factor;
        el.style.transform = `translateY(${off.toFixed(1)}px) scale(1.06)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(upd); ticking = true; } }, { passive: true });
    upd();
  }

  /* ---------- Timeline scroll fill ---------- */
  function initTimelineFill() {
    const tls = $$(".timeline");
    const upd = () => {
      const vh = window.innerHeight;
      tls.forEach(tl => {
        if (!tl.offsetParent) return;
        const r = tl.getBoundingClientRect();
        const p = (vh * 0.6 - r.top) / r.height;
        tl.style.setProperty("--fill", Math.max(0, Math.min(1, p)) * 100 + "%");
      });
    };
    upd();
    window.addEventListener("scroll", upd, { passive: true });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderSpeakers();
    renderAgenda();
    renderList();
    initReveal();
    initCounters();
    initCountdown();
    initHeader();
    initMenu();
    initTabs();
    initAnchors();
    initProgress();
    initHeroCanvas();
    initHeroScroll();
    initImgParallax();
    initTimelineFill();
  });
})();
