// Runs before the stylesheet paints. A blocked storage API never blocks the page.
try {
  const theme = localStorage.getItem('gitline-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch { /* Use the system preference. */ }
