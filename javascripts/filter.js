document.addEventListener('DOMContentLoaded', function () {
  var chips = document.querySelectorAll('.filter-chip');
  var clearBtn = document.querySelector('.clear-filters-btn');
  var links = document.querySelectorAll('.project-link');
  var filterBar = document.querySelector('.filter-bar');

  // Macro tabs
  var macroTabs = document.querySelectorAll('.macro-tab');
  var macroSections = document.querySelectorAll('.macro-section');

  function switchMacroTab(macro) {
    macroTabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-macro') === macro);
    });
    macroSections.forEach(function (section) {
      section.classList.toggle('hidden', section.getAttribute('data-macro') !== macro);
    });

    // Collect categories present in the visible section
    var visibleSection = document.querySelector('.macro-section[data-macro="' + macro + '"]');
    var visibleCats = new Set();
    if (visibleSection) {
      visibleSection.querySelectorAll('.project-link').forEach(function (link) {
        (link.getAttribute('data-categories') || '').split(/\s+/).forEach(function (c) {
          if (c) visibleCats.add(c);
        });
      });
    }

    // Show/hide filter chips based on whether their category exists in this section
    chips.forEach(function (chip) {
      var cat = chip.getAttribute('data-category');
      chip.style.display = visibleCats.has(cat) ? '' : 'none';
      // Clear active state for hidden chips
      if (!visibleCats.has(cat)) chip.classList.remove('active');
    });

    // Re-apply category filters within the newly visible section
    filterProjects();
  }

  macroTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchMacroTab(tab.getAttribute('data-macro'));
    });
  });

  function getActiveCategories() {
    var active = [];
    chips.forEach(function (chip) {
      if (chip.classList.contains('active')) {
        active.push(chip.getAttribute('data-category'));
      }
    });
    return active;
  }

  function filterProjects() {
    var active = getActiveCategories();
    var hasFilters = active.length > 0;

    if (filterBar) {
      filterBar.classList.toggle('has-filters', hasFilters);
    }

    links.forEach(function (link) {
      if (!hasFilters) {
        link.classList.remove('hidden');
        return;
      }
      var cats = (link.getAttribute('data-categories') || '').split(/\s+/);
      var match = active.some(function (a) { return cats.indexOf(a) !== -1; });
      link.classList.toggle('hidden', !match);
    });

    updateURL(active);
  }

  function updateURL(active) {
    var url = new URL(window.location);
    if (active.length > 0) {
      url.searchParams.set('cat', active.join(','));
    } else {
      url.searchParams.delete('cat');
    }
    history.replaceState(null, '', url);
  }

  function applyFromURL() {
    var params = new URLSearchParams(window.location.search);
    var cat = params.get('cat');
    if (!cat) return;
    var cats = cat.split(',');
    chips.forEach(function (chip) {
      if (cats.indexOf(chip.getAttribute('data-category')) !== -1) {
        chip.classList.add('active');
      }
    });
    filterProjects();
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chip.classList.toggle('active');
      filterProjects();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      chips.forEach(function (chip) {
        chip.classList.remove('active');
      });
      filterProjects();
    });
  }

  // Initialize chip visibility for the default active tab
  var activeTab = document.querySelector('.macro-tab.active');
  if (activeTab) switchMacroTab(activeTab.getAttribute('data-macro'));

  applyFromURL();

  // View toggle (grid <-> row)
  var viewBtn = document.querySelector('.view-toggle-btn');
  var containers = document.querySelectorAll('.project-container');
  if (viewBtn && containers.length) {
    // Restore saved preference
    if (localStorage.getItem('projectView') === 'row') {
      containers.forEach(function (c) { c.classList.add('row-view'); });
      viewBtn.innerHTML = '<i class="fas fa-th-large"></i>';
      viewBtn.setAttribute('title', 'Switch to grid view');
    }

    viewBtn.addEventListener('click', function () {
      var isRow = !containers[0].classList.contains('row-view');
      containers.forEach(function (c) { c.classList.toggle('row-view'); });
      if (isRow) {
        viewBtn.innerHTML = '<i class="fas fa-th-large"></i>';
        viewBtn.setAttribute('title', 'Switch to grid view');
        localStorage.setItem('projectView', 'row');
      } else {
        viewBtn.innerHTML = '<i class="fas fa-bars"></i>';
        viewBtn.setAttribute('title', 'Switch to row view');
        localStorage.setItem('projectView', 'grid');
      }
    });
  }
});
