import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './services/installPrompt';

const root = createRoot(document.getElementById('root')!);

// Portal público de aprovação do cliente (sem login): /aprovar/<token>
const portal = window.location.pathname.match(/^\/aprovar\/([^/]+)\/?$/);

if (portal) {
  void import('./components/portal/ClientPortal').then(({ ClientPortal }) =>
    root.render(
      <StrictMode>
        <ClientPortal token={portal[1]} />
      </StrictMode>
    )
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
