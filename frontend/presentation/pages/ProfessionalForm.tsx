import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfessionalForm() {
  const navigate = useNavigate();
  
  // Estado para manejar los datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    especialidad: '',
    telefono: '',
    cedula: ''
  });

  // Manejador de cambios en los inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Función para simular el guardado
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Datos a enviar al backend Java:', formData);
    // Aquí irá el fetch: POST /api/profesionales
    alert('Profesional registrado con éxito (Simulación)');
    navigate('/profesionales'); // Volver a la tabla
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', fontFamily: 'sans-serif' }}>
      <h2>Registrar Nuevo Profesional</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label>Nombre Completo:</label>
          <input 
            type="text" 
            name="nombre" 
            value={formData.nombre} 
            onChange={handleChange} 
            required 
            style={{ padding: '8px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label>Cédula / Documento:</label>
          <input 
            type="text" 
            name="cedula" 
            value={formData.cedula} 
            onChange={handleChange} 
            required 
            style={{ padding: '8px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label>Especialidad:</label>
          <select 
            name="especialidad" 
            value={formData.especialidad} 
            onChange={handleChange} 
            required
            style={{ padding: '8px' }}
          >
            <option value="">Seleccione una especialidad...</option>
            <option value="Geriatría">Geriatría</option>
            <option value="Fisioterapia">Fisioterapia</option>
            <option value="Enfermería">Enfermería General</option>
            <option value="Psicología">Psicología</option>
            <option value="Nutrición">Nutrición y Dietética</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label>Teléfono de Contacto:</label>
          <input 
            type="tel" 
            name="telefono" 
            value={formData.telefono} 
            onChange={handleChange} 
            required 
            style={{ padding: '8px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>
            Guardar Profesional
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/profesionales')}
            style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}
          >
            Cancelar
          </button>
        </div>

      </form>
    </div>
  );
}