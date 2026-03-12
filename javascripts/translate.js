/* Custom language dropdown that wraps Google Translate */

/* Override the broken showTranslateOptions from inline scripts */
window.showTranslateOptions = function () {};

(function () {
  var LANGUAGES = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'zh-CN', label: '中文', flag: 'CN' },
    { code: 'es', label: 'Español', flag: 'ES' },
    { code: 'fr', label: 'Français', flag: 'FR' },
    { code: 'de', label: 'Deutsch', flag: 'DE' },
    { code: 'ja', label: '日本語', flag: 'JA' },
    { code: 'ru', label: 'Русский', flag: 'RU' }
  ];

  function createDropdown() {
    var container = document.getElementById('google_translate_element');
    if (!container) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'lang-switcher';

    var btn = document.createElement('button');
    btn.className = 'lang-btn';
    btn.type = 'button';
    btn.textContent = 'EN';
    btn.setAttribute('aria-label', 'Select language');

    var menu = document.createElement('div');
    menu.className = 'lang-dropdown';

    LANGUAGES.forEach(function (lang) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'lang-option';
      if (lang.code === 'en') item.classList.add('active');
      item.setAttribute('data-lang', lang.code);
      item.textContent = lang.label;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        selectLanguage(lang, menu);
        wrapper.classList.remove('open');
      });
      menu.appendChild(item);
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(menu);

    container.parentNode.insertBefore(wrapper, container);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      wrapper.classList.toggle('open');
    });

    document.addEventListener('click', function () {
      wrapper.classList.remove('open');
    });
  }

  function waitForCombo(callback, attempts) {
    var combo = document.querySelector('.goog-te-combo');
    if (combo) {
      callback(combo);
    } else if (attempts < 50) {
      setTimeout(function () { waitForCombo(callback, attempts + 1); }, 100);
    }
  }

  function selectLanguage(lang, menu) {
    /* Update button label */
    var btn = document.querySelector('.lang-btn');
    if (btn) btn.textContent = lang.flag;

    /* Update active state */
    menu.querySelectorAll('.lang-option').forEach(function (opt) {
      opt.classList.toggle('active', opt.getAttribute('data-lang') === lang.code);
    });

    if (lang.code === 'en') {
      /* Restore original: clear cookie and reload */
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
      /* Try the restore button in the banner frame */
      var frame = document.querySelector('.goog-te-banner-frame');
      if (frame) {
        try {
          var restoreBtn = frame.contentDocument.querySelector('.goog-close-link');
          if (restoreBtn) { restoreBtn.click(); return; }
        } catch (e) { /* cross-origin */ }
      }
      location.reload();
    } else {
      waitForCombo(function (combo) {
        combo.value = lang.code;
        combo.dispatchEvent(new Event('change'));
      }, 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDropdown);
  } else {
    createDropdown();
  }
})();
