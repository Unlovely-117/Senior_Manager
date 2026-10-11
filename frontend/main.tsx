import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './presentation/App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("No se encontró el elemento 'root' en el index.html");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);