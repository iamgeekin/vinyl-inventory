import '@fontsource-variable/figtree/wght.css';
import '@fontsource-variable/fraunces/opsz.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { ThemeProvider } from './theme/ThemeContext';

// iPhone only shows pressed states on pages that listen for touches.
document.addEventListener('touchstart', () => {}, { passive: true });
// Safari has its own switch control; other browsers get a drawn one.
document.documentElement.classList.toggle('native-switch', 'switch' in HTMLInputElement.prototype);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
