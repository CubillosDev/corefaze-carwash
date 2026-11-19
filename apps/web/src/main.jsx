import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/dm-sans/opsz.css';
import '@fontsource/jetbrains-mono/600.css';
import '@/styles/global.css';

import { App } from '@/app/App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
