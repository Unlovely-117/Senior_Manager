import React from 'react';
import { Outlet } from 'react-router-dom';
import '../styles/global.css'; // Importamos los estilos globales

export const Layout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra Superior */}
      <header style={{ backgroundColor: '#153b8f', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>SENIOR-MANAGE</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem' }}>👤 Usuario</span>
        </div>
      </header>

      {/* Contenedor Principal Centrado */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '900px', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e1e8f0' }}>
          {/* El componente Outlet es donde React Router inyectará las diferentes pantallas */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};