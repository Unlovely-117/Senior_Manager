import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Autenticando:', email);
    // Simula el login exitoso y redirige al dashboard
    navigate('/home'); 
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#f0f2f5', 
      fontFamily: 'Arial, sans-serif' 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '40px', 
        borderRadius: '10px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
        width: '100%',
        maxWidth: '350px'
      }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '24px' }}>
          Ingreso a Senior-Manage
        </h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '6px', color: '#555', fontSize: '14px', fontWeight: 'bold' }}>
              Correo Electrónico
            </label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
              placeholder="admin@senior-manage.com"
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '6px', color: '#555', fontSize: '14px', fontWeight: 'bold' }}>
              Contraseña
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            style={{ 
              marginTop: '10px',
              padding: '12px', 
              backgroundColor: '#0056b3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}