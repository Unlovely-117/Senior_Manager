// src/pages/ProfessionalsDashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Interfaz para TypeScript basada en los datos esperados
interface Professional {
  id: number;
  nombre: string;
  especialidad: string;
  telefono: string;
}

export default function ProfessionalsDashboard() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Aquí harías la petición GET a tu backend de Java: GET /api/profesionales
    // Simulando los datos por ahora:
    setProfessionals([
      { id: 1, nombre: 'Dra. María Gómez', especialidad: 'Geriatría', telefono: '3001234567' },
      { id: 2, nombre: 'Dr. Carlos Pérez', especialidad: 'Fisioterapia', telefono: '3109876543' }
    ]);
  }, []);

  return (
    <div>
      <h1>Gestión de Profesionales de la Salud</h1>
      <button onClick={() => navigate('/profesionales/nuevo')}>+ Registrar Nuevo Profesional</button>
      
      <table border={1} style={{ marginTop: '20px', width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Especialidad</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {professionals.map((prof) => (
            <tr key={prof.id}>
              <td>{prof.id}</td>
              <td>{prof.nombre}</td>
              <td>{prof.especialidad}</td>
              <td>{prof.telefono}</td>
              <td>
                <button>Editar</button>
                <button>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}