document.addEventListener('DOMContentLoaded', function () {
  var chips = document.querySelectorAll('.filter-chip');
  var clearBtn = document.querySelector('.clear-filters-btn');
  var links = document.querySelectorAll('.project-link');
  var filterBar = document.querySelector('.filter-bar');

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

  applyFromURL();
});
