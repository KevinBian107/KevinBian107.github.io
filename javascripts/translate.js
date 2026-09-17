/* Google Translate widget.
   The widget itself lives in a .translate-wrap next to whatever opens it --
   the "Language" row in the home rail, or the globe pill in the top bar --
   and is revealed by toggling .is-open on that wrapper. */
(function () {
  function openWraps() {
    return document.querySelectorAll('.translate-wrap.is-open');
  }

  function closeAll() {
    Array.prototype.forEach.call(openWraps(), function (w) {
      w.classList.remove('is-open');
      var btn = w.querySelector('[data-translate-toggle]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  function bind() {
    var toggles = document.querySelectorAll('[data-translate-toggle]');

    Array.prototype.forEach.call(toggles, function (btn) {
      var wrap = btn.parentNode;
      while (wrap && !(wrap.classList && wrap.classList.contains('translate-wrap'))) {
        wrap = wrap.parentNode;
      }
      if (!wrap) return;

      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var willOpen = !wrap.classList.contains('is-open');
        closeAll();
        wrap.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    });

    // Click-away and Escape both dismiss. The toggle's own click is inside the
    // wrapper, so it never closes what it just opened.
    document.addEventListener('click', function (e) {
      Array.prototype.forEach.call(openWraps(), function (w) {
        if (!w.contains(e.target)) {
          w.classList.remove('is-open');
          var btn = w.querySelector('[data-translate-toggle]');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
