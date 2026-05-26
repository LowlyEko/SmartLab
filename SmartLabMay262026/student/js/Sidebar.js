// Student Portal - Shared Sidebar Logic (Dark Mode)
document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.querySelector('.toggle-switch');
  const modeText = document.querySelector('.mode-text');

  // Apply saved theme
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    if (modeText) modeText.textContent = 'Light Mode';
  }

  // Toggle dark mode
  if (toggleSwitch) {
    toggleSwitch.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      if (modeText) modeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
});