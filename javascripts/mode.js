document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const themeToggleIcon = document.getElementById('theme-toggle');

    function updateTheme() {
      if (body.classList.contains('dark-mode')) {
        themeToggle.textContent = '☀️'; // Text for light mode
      } else {
        themeToggle.textContent = '🌙'; // Text for dark mode
      }
    }
  
    themeToggle.addEventListener('click', function() {
      body.classList.toggle('dark-mode');
      updateTheme();
      localStorage.setItem('dark-mode', body.classList.contains('dark-mode'));
    });
  
    // Check if dark mode preference is stored in local storage
    if (localStorage.getItem('dark-mode') === 'true') {
      body.classList.add('dark-mode');
    }
    updateTheme(); // Set the initial text based on the theme
  });
  