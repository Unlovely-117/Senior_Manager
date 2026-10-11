import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '../components/Layout';

// Componente temporal para comprobar que funciona
const InicioTemporal = () => (
  <div style={{ textAlign: 'center' }}>
    <h2>Bienvenido a Senior-Manage</h2>
    <p style={{ marginTop: '1rem', color: '#666' }}>El sistema de enrutamiento y layout está funcionando correctamente.</p>
  </div>
);

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Todas las rutas dentro de este bloque usarán el Layout principal */}
        <Route path="/" element={<Layout />}>
          <Route index element={<InicioTemporal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};