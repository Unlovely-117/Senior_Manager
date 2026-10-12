/// <reference types="vite/client" />

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './presentation/routes/AppRouter';
import './presentation/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);