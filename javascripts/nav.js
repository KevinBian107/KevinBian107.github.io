/* Top bar state, and the home page's scroll-linked reveal.

   Both hang off one rAF-throttled scroll loop rather than a listener each, so
   a scroll costs a single pass over the page's measurements. */
(function () {
  var frameTasks = [];
  var ticking = false;

  function run() {
    ticking = false;
    for (var i = 0; i < frameTasks.length; i++) frameTasks[i]();
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(run);
  }

  /* The pill for the page you are on keeps its label expanded and tinted; a
     write-up under research/ or projects/ still counts as Research. On the
     home page the #news / #experience pills stay folded until you scroll. */
  function initNav() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll('.nav-icon-link[href]')
    );
    if (!links.length) return;

    var path = window.location.pathname;
    var here = path.split('/').pop() || 'index.html';
    var inDetailDir = /\/(research|projects|ideas)\//.test(path);
    var spied = [];

    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;

      if (href.charAt(0) === '#') {
        var el = document.querySelector(href);
        if (el) spied.push({ link: a, el: el });
        return;
      }
      if (/^(https?:)?\/\//i.test(href) || href.indexOf('mailto:') === 0) return;

      var file = href.split('#')[0].split('/').pop();
      if (!file) return;
      if (file === here || (inDetailDir && file === 'research.html')) {
        a.classList.add('is-active');
      }
    });

    if (!spied.length) return;

    // A reload should land on the hero rather than wherever you left off,
    // otherwise the pills come back already unfolded. An explicit
    // index.html#news link is still honoured.
    if ('scrollRestoration' in history && !window.location.hash) {
      history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }

    var REVEAL_AT = 100;

    frameTasks.push(function () {
      var y = window.pageYOffset;
      var doc = document.documentElement;
      var atBottom = window.innerHeight + y >= doc.scrollHeight - 2;
      var revealed = y > REVEAL_AT;
      var probe = y + 160;
      var current = null;

      spied.forEach(function (s) {
        s.link.classList.toggle('is-revealed', revealed);
        if (s.el.getBoundingClientRect().top + y <= probe) current = s;
      });
      if (atBottom) current = spied[spied.length - 1];

      spied.forEach(function (s) {
        s.link.classList.toggle('is-active', s === current);
      });
    });
  }

  /* Each row and card is mapped from its position in the viewport straight
     onto opacity: at rest below the fold it sits at FLOOR, and it resolves as
     it rises. Driven by position rather than a one-shot trigger, so the fade
     tracks the scroll instead of firing once at a threshold. */
  function initReveal() {
    var items = Array.prototype.slice.call(
      document.querySelectorAll('.reveal-item')
    );
    if (!items.length) return;

    var reduce =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      document.documentElement.classList.remove('reveal-ready');
      return;
    }

    // Tells the head-script failsafe that the ramp is live, so it leaves the
    // dimming in place instead of releasing it.
    window.__revealActive = true;

    var FLOOR = 0; // fully out of sight until you scroll toward it
    var LIFT = 24;

    function smoothstep(t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return t * t * (3 - 2 * t);
    }

    frameTasks.push(function () {
      var h = window.innerHeight || document.documentElement.clientHeight;
      var doc = document.documentElement;
      var atBottom = window.innerHeight + window.pageYOffset >= doc.scrollHeight - 2;
      var enter = h * 0.88;
      var settle = h * 0.55;

      // Position alone is not enough: on a tall window there is room below the
      // hero for News to sit well inside the first screen, and it would come
      // up already visible. Gating on how far the page has actually been
      // scrolled keeps the resting view clean at any window height, and ramps
      // over the first quarter-screen so it still arrives smoothly.
      var gate = smoothstep(window.pageYOffset / (h * 0.25));

      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var p;

        // Risen past the settle line, or sitting in the last screen the page
        // can reach. Deliberately not "fully inside the viewport": a short row
        // low in the first screen is exactly what should still be dim.
        if (atBottom || r.top <= settle) p = 1;
        else if (r.top >= enter) p = 0;
        else p = (enter - r.top) / (enter - settle);

        p = smoothstep(p) * gate;

        el.style.opacity = (FLOOR + (1 - FLOOR) * p).toFixed(3);
        el.style.transform =
          p === 1 ? '' : 'translateY(' + ((1 - p) * LIFT).toFixed(1) + 'px)';
      });
    });
  }

  function start() {
    initNav();
    initReveal();
    if (!frameTasks.length) return;

    run();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
