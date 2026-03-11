/**
 * ARUN GOVINDGARI PORTFOLIO — app.js v3
 * Fixed: reveal sections, light mode, form, rate-limit
 */
'use strict';

/* ── Sanitizer ─────────────────────────────────────────── */
const San = {
  text(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  },
  email(s) {
    if (typeof s !== 'string') return '';
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(s.trim()) ? s.trim() : '';
  }
};

/* ── Rate limiter ──────────────────────────────────────── */
const RL = {
  can() { return Date.now() - (+sessionStorage.getItem('_cl')||0) > 60000; },
  mark() { sessionStorage.setItem('_cl', Date.now()); }
};

/* ══ INIT ══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* CRITICAL: mark JS as loaded BEFORE reveal so CSS transitions engage */
  document.documentElement.classList.add('js-loaded');

  initPreloader();
  initTheme();       // theme FIRST so colors are right before anything else
  initNavbar();
  initCanvas();
  initTyping();
  initReveal();      // after js-loaded class is set
  initSkillTabs();
  initSkillBars();
  initExpTabs();
  initProjFilter();
  initForm();
  initBackTop();
  initActiveLinks();
  initCertBars();
});

/* ── Preloader ─────────────────────────────────────────── */
function initPreloader() {
  const el = document.getElementById('preloader');
  if (!el) return;
  const hide = () => el.classList.add('hidden');
  if (document.readyState === 'complete') setTimeout(hide, 250);
  else { window.addEventListener('load', () => setTimeout(hide, 250), {once:true}); setTimeout(hide, 2000); }
}

/* ── Theme ─────────────────────────────────────────────── */
function initTheme() {
  const btn  = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  const html = document.documentElement;
  if (!btn || !icon) return;

  // Apply saved preference immediately
  const saved = localStorage.getItem('ag-theme') || 'dark';
  setTheme(saved);

  btn.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ag-theme', next);
  });

  function setTheme(t) {
    html.setAttribute('data-theme', t);
    // Swap SVG icon via <use> href
    const use = icon.querySelector('use');
    if (use) use.setAttribute('href', t === 'light' ? '#i-sun' : '#i-moon');
    btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    btn.title = t === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
  }
}

/* ── Navbar ─────────────────────────────────────────────── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const update = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', update, {passive:true});
  update();

  // Close mobile menu on link click + instantly show destination section
  const menu = document.getElementById('navMenu');
  if (menu && window.bootstrap) {
    const bc = bootstrap.Collapse.getOrCreateInstance(menu, {toggle:false});
    nav.querySelectorAll('.nav-link').forEach(l => {
      l.addEventListener('click', () => {
        // CRITICAL: show ALL reveal elements immediately on nav click
        // so the destination section is never blank when scrolled to
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));

        if (window.innerWidth < 992 && menu.classList.contains('show')) bc.hide();
      });
    });
  }
}

/* ── Active nav links ──────────────────────────────────── */
function initActiveLinks() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('#navbar .nav-link');
  if (!sections.length) return;
  new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting)
        links.forEach(l => l.classList.toggle('active-link', l.getAttribute('href') === '#'+e.target.id));
    }),
    {rootMargin:'-40% 0px -55% 0px'}
  ).observe(...[...sections].map(s => (new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting)
        links.forEach(l => l.classList.toggle('active-link', l.getAttribute('href') === '#'+e.target.id));
    }),
    {rootMargin:'-40% 0px -55% 0px'}
  ).observe(s), s)));
  // simpler version:
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(l => l.classList.toggle('active-link', l.getAttribute('href') === '#'+e.target.id));
    }),
    {rootMargin:'-40% 0px -55% 0px'}
  );
  sections.forEach(s => obs.observe(s));
}

/* ── arun canvas ───────────────────────────────────────── */
function initCanvas() {
  const cv = document.getElementById('arunCanvas');
  if (!cv || window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const ctx = cv.getContext('2d');
  let pts = [], raf;

  function resize() { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }

  function Pt() {
    this.x  = Math.random() * cv.width;  this.y  = Math.random() * cv.height;
    this.vx = (Math.random()-.5)*.4;     this.vy = (Math.random()-.5)*.4;
    this.r  = Math.random()*1.4+.4;      this.a  = Math.random()*.45+.15;
  }
  Pt.prototype.tick = function() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0 || this.x > cv.width)  this.vx *= -1;
    if (this.y < 0 || this.y > cv.height) this.vy *= -1;
  };

  function init() {
    resize(); pts = [];
    const n = Math.min(55, Math.floor(cv.width * cv.height / 16000));
    for (let i=0;i<n;i++) pts.push(new Pt());
  }

  function draw() {
    ctx.clearRect(0,0,cv.width,cv.height);
    // Use accent colour from CSS variable
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const col = isDark ? '0,200,255' : '0,104,192';
    pts.forEach(p => {
      p.tick();
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${col},${p.a})`; ctx.fill();
    });
    pts.forEach((a,i) => {
      for (let j=i+1;j<pts.length;j++) {
        const b=pts[j], d=Math.hypot(a.x-b.x,a.y-b.y);
        if (d<120) {
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle=`rgba(${col},${.07*(1-d/120)})`; ctx.lineWidth=.5; ctx.stroke();
        }
      }
    });
    raf = requestAnimationFrame(draw);
  }

  init(); draw();
  let rt;
  window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ cancelAnimationFrame(raf); init(); draw(); },200); },{passive:true});
}

/* ── Typing effect ─────────────────────────────────────── */
function initTyping() {
  const el = document.getElementById('typingText');
  if (!el) return;
  const words = ['Azure Data Pipelines','Scalable ETL Systems','Data Analytics Platforms','Cloud Data Architectures','Healthcare Data Solutions'];
  let wi=0, ci=0, del=false;
  function tick() {
    const w = words[wi];
    ci = del ? ci-1 : ci+1;
    el.textContent = w.substring(0, ci);
    let ms = del ? 48 : 88;
    if (!del && ci===w.length)        { ms=2200; del=true; }
    else if (del && ci===0)            { del=false; wi=(wi+1)%words.length; ms=400; }
    setTimeout(tick, ms);
  }
  setTimeout(tick, 1100);
}

/* ── Scroll Reveal ─────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  // Immediately show elements that are already visible in viewport
  function showIfVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.96) el.classList.add('visible');
  }
  els.forEach(showIfVisible);

  // Watch for elements entering viewport as user scrolls
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

  els.forEach(el => { if (!el.classList.contains('visible')) obs.observe(el); });

  // Safety fallback: show ALL after 400ms no matter what (was 1500ms)
  setTimeout(() => els.forEach(el => el.classList.add('visible')), 400);
}

/* ── Skill tabs ────────────────────────────────────────── */
function initSkillTabs() {
  const tabs  = document.querySelectorAll('.skill-tab');
  const cards = document.querySelectorAll('#skillsGrid .skill-card');
  tabs.forEach(t => t.addEventListener('click', () => {
    const cat = t.dataset.category;
    tabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
    t.classList.add('active'); t.setAttribute('aria-selected','true');
    cards.forEach(c => {
      const show = cat==='all' || c.dataset.category===cat;
      c.style.display = show ? '' : 'none';
      if (show) { c.classList.remove('animated'); void c.offsetWidth; c.classList.add('animated'); }
    });
  }));
}

/* ── Skill bars ────────────────────────────────────────── */
function initSkillBars() {
  new IntersectionObserver(
    entries => entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('animated'); } }),
    {threshold:.15}
  ).observe(...(document.querySelectorAll('.skill-card').length
    ? [...document.querySelectorAll('.skill-card')]
    : [document.createElement('div')]));

  // Simpler direct observer
  const obs2 = new IntersectionObserver(
    entries => entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('animated'); }),
    {threshold:.15}
  );
  document.querySelectorAll('.skill-card').forEach(c => obs2.observe(c));
}

/* ── Experience tabs ───────────────────────────────────── */
function initExpTabs() {
  const tabs   = document.querySelectorAll('.exp-tab');
  const panels = {
    'work-exp':  document.getElementById('work-exp'),
    'education': document.getElementById('education')
  };
  tabs.forEach(t => t.addEventListener('click', () => {
    const tgt = t.dataset.target;
    tabs.forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected','false'); });
    t.classList.add('active'); t.setAttribute('aria-selected','true');
    Object.entries(panels).forEach(([k,p]) => { if(p) p.style.display = k===tgt ? '' : 'none'; });
    const p = panels[tgt];
    if (p) p.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }));
}

/* ── Project filter ────────────────────────────────────── */
function initProjFilter() {
  const btns  = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('#projectsGrid .project-card');
  btns.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.filter;
    btns.forEach(x => x.classList.remove('active')); b.classList.add('active');
    cards.forEach(c => {
      const show = f==='all' || c.dataset.category===f;
      c.style.display = show ? '' : 'none';
      if (show) {
        c.style.opacity='0'; c.style.transform='translateY(14px)';
        requestAnimationFrame(() => {
          c.style.transition='opacity .3s ease,transform .3s ease';
          c.style.opacity='1'; c.style.transform='translateY(0)';
        });
      }
    });
  }));
}

/* ── Contact form (Formspree) ──────────────────────────── */
function initForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  const action = form.getAttribute('action') || '';

  // Field refs
  const F = {
    name:    {el:document.getElementById('contactName'),    err:document.getElementById('nameError'),    min:2,  max:100},
    email:   {el:document.getElementById('contactEmail'),   err:document.getElementById('emailError'),   isEmail:true},
    subject: {el:document.getElementById('contactSubject'), err:document.getElementById('subjectError'), min:3,  max:200},
    message: {el:document.getElementById('contactMessage'), err:document.getElementById('messageError'), min:10, max:2000},
  };
  const okEl  = document.getElementById('formSuccess');
  const errEl = document.getElementById('formError');
  const btn   = document.getElementById('submitBtn');
  const txt   = document.getElementById('submitText');
  const spin  = document.getElementById('submitSpinner');

  function valid(k) {
    const {el,err,min,max,isEmail} = F[k]; if(!el||!err) return true;
    const v = el.value.trim();
    if(!v) { mark(el,err,'Required'); return false; }
    if(isEmail && !San.email(v)) { mark(el,err,'Valid email required'); return false; }
    if(min && v.length<min) { mark(el,err,`Min ${min} chars`); return false; }
    if(max && v.length>max) { mark(el,err,`Max ${max} chars`); return false; }
    if(/[<>]/.test(v))      { mark(el,err,'Invalid characters'); return false; }
    clear(el,err); return true;
  }
  function mark(el,err,msg) { el.classList.add('error'); err.textContent=msg; }
  function clear(el,err)    { el.classList.remove('error'); err.textContent=''; }

  Object.keys(F).forEach(k => {
    const {el} = F[k]; if(!el) return;
    el.addEventListener('blur', () => valid(k));
    el.addEventListener('input', () => { if(el.classList.contains('error')) valid(k); });
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!Object.keys(F).map(k => valid(k)).every(Boolean)) return;
    if (!RL.can()) { if(errEl){ errEl.textContent='⏳ Please wait before submitting again.'; errEl.style.display=''; setTimeout(()=>errEl.style.display='none',4000); } return; }

    setLoading(true);
    if(okEl)  okEl.style.display  = 'none';
    if(errEl) errEl.style.display = 'none';

    try {
      const fd  = new FormData(form);
      const res = await fetch(action, { method:'POST', body:fd, headers:{Accept:'application/json'} });
      if (res.ok) {
        form.reset(); RL.mark();
        if(okEl) okEl.style.display = '';
        setTimeout(() => { if(okEl) okEl.style.display='none'; }, 7000);
      } else {
        throw new Error('server');
      }
    } catch(_) {
      if(errEl) errEl.style.display = '';
    } finally {
      setLoading(false);
    }
  });

  function setLoading(on) {
    if(btn)  btn.disabled          = on;
    if(txt)  txt.style.display     = on ? 'none' : '';
    if(spin) spin.style.display    = on ? ''     : 'none';
  }
}

/* ── Back to top ───────────────────────────────────────── */
function initBackTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), {passive:true});
  btn.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
}

/* ── Cert bar animation ────────────────────────────────── */
function initCertBars() {
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const fill = getComputedStyle(e.target).getPropertyValue('--fill').trim();
      if (fill) e.target.style.width = fill;
      obs.unobserve(e.target);
    }), {threshold:.3}
  );
  document.querySelectorAll('.cert-bar-fill').forEach(b => obs.observe(b));
}
