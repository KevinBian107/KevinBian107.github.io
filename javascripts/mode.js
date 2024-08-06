document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
  
    function updateTheme() {
      if (body.classList.contains('dark-mode')) {
        themeToggle.textContent = '🌅 Light Mode'; // Text for light mode
      } else {
        themeToggle.textContent = '🌙 Dark Mode'; // Text for dark mode
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
  