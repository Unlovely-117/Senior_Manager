import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  // Paleta de colores basada en tu imagen
  const colors = {
    primary: '#1fb5b2', // Turquesa
    secondary: '#ff9800', // Naranja
    bgLight: '#f4f7f6',
    textDark: '#2c3e50',
    textGray: '#8fa0b0',
    white: '#ffffff',
    border: '#ecf0f1'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: colors.bgLight, fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", margin: 0, overflow: 'hidden' }}>
      
      {/* ================= BARRA LATERAL (SIDEBAR) ================= */}
      <div style={{ width: '260px', backgroundColor: colors.white, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        
        {/* Logo */}
        <div style={{ padding: '0 30px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '24px', height: '24px', backgroundColor: colors.primary, borderRadius: '4px', transform: 'rotate(45deg)' }}></div>
          <h2 style={{ color: colors.textDark, margin: 0, fontSize: '22px' }}>Senior-Manage</h2>
        </div>

        {/* Menú */}
        <div style={{ padding: '0 15px', flex: 1 }}>
          <p style={{ padding: '0 15px', color: colors.textGray, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>General</p>
          
          <div style={{ padding: '12px 15px', color: colors.textGray, cursor: 'pointer', borderRadius: '8px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>📊</span> Dashboard
          </div>
          
          {/* Item Activo */}
          <div style={{ padding: '12px 15px', backgroundColor: '#e8f7f7', color: colors.primary, cursor: 'pointer', borderRadius: '8px', display: 'flex', gap: '15px', alignItems: 'center', fontWeight: 'bold', marginBottom: '5px' }}>
            <span>📅</span> Calendario
          </div>
          
          <div onClick={() => navigate('/profesionales')} style={{ padding: '12px 15px', color: colors.textGray, cursor: 'pointer', borderRadius: '8px', display: 'flex', gap: '15px', alignItems: 'center', marginLeft: '10px' }}>
            <span>👨‍⚕️</span> Profesionales
          </div>

          <div style={{ padding: '12px 15px', color: colors.textGray, cursor: 'pointer', borderRadius: '8px', display: 'flex', gap: '15px', alignItems: 'center', marginLeft: '10px' }}>
            <span>👵</span> Adultos Mayores
          </div>
          
          <p style={{ padding: '20px 15px 0', color: colors.textGray, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Preferencias</p>
          
          <div style={{ padding: '12px 15px', color: colors.textGray, cursor: 'pointer', borderRadius: '8px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>⚙️</span> Ajustes
          </div>
        </div>

        {/* Botón Salir */}
        <div style={{ padding: '0 30px' }}>
          <div onClick={() => navigate('/login')} style={{ padding: '12px 0', color: colors.textGray, cursor: 'pointer', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>🚪</span> Cerrar Sesión
          </div>
        </div>
      </div>

      {/* ================= ÁREA PRINCIPAL ================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        
        {/* Header Superior */}
        <div style={{ height: '80px', backgroundColor: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: `1px solid ${colors.border}` }}>
          
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.bgLight, padding: '10px 20px', borderRadius: '20px', width: '300px' }}>
            <span style={{ marginRight: '10px' }}>🔍</span>
            <input type="text" placeholder="Buscar citas, profesionales..." style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', color: colors.textDark }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ cursor: 'pointer', fontSize: '20px' }}>🔔</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: colors.primary, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>AD</div>
              <span style={{ color: colors.textDark, fontWeight: '500' }}>Admin</span>
            </div>
          </div>
        </div>

        {/* Contenido (Grid de 2 Columnas) */}
        <div style={{ padding: '30px 40px', display: 'flex', gap: '30px' }}>
          
          {/* Columna Izquierda: Calendario Gigante */}
          <div style={{ flex: 2, backgroundColor: colors.white, borderRadius: '16px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            
            {/* Header del Calendario */}
            <div style={{ backgroundColor: colors.primary, borderRadius: '12px', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: colors.white, marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '500' }}>Octubre 2026</h3>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>{"<"}</button>
                  <button style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>{">"}</button>
                </div>
              </div>
              <button style={{ backgroundColor: colors.secondary, color: colors.white, border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)' }}>
                Crear Cita
              </button>
            </div>

            {/* Días de la semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginBottom: '10px' }}>
              {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(day => (
                <div key={day} style={{ textAlign: 'center', color: colors.textGray, fontSize: '12px', fontWeight: 'bold' }}>{day}</div>
              ))}
            </div>

            {/* Grid del calendario simulado */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', minHeight: '400px' }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px', minHeight: '80px', position: 'relative' }}>
                  <span style={{ color: colors.textDark, fontWeight: '500' }}>{i + 1}</span>
                  
                  {/* Evento Simulado en el día 6 */}
                  {i === 5 && (
                    <div style={{ backgroundColor: colors.primary, color: 'white', padding: '5px', borderRadius: '4px', fontSize: '10px', marginTop: '10px' }}>
                      10am - Cita<br/>Dra. María G.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Columna Derecha: Próximas Citas y Chat */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Tarjeta de Próxima Cita */}
            <div style={{ backgroundColor: colors.white, borderRadius: '16px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: colors.textDark, fontSize: '16px' }}>Próxima Cita</h3>
                <span style={{ color: colors.textGray, cursor: 'pointer' }}>•••</span>
              </div>

              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#eee', backgroundImage: 'url(https://i.pravatar.cc/150?img=11)', backgroundSize: 'cover' }}></div>
                <div>
                  <h4 style={{ margin: 0, color: colors.textDark, fontSize: '15px' }}>Carlos Pérez</h4>
                  <p style={{ margin: 0, color: colors.textGray, fontSize: '12px' }}>Paciente Frecuente</p>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: 0, color: colors.textGray, fontSize: '12px', marginBottom: '5px' }}>Hora</p>
                <p style={{ margin: 0, color: colors.textDark, fontSize: '14px', fontWeight: '500' }}>Lunes, 12 Octubre • 10:00am - 11:00am</p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: 0, color: colors.textGray, fontSize: '12px', marginBottom: '5px' }}>Servicio</p>
                <p style={{ margin: 0, color: colors.textDark, fontSize: '14px', fontWeight: '500' }}>Consulta Geriatría</p>
              </div>
            </div>

            {/* Widget de Chat Rápido */}
            <div style={{ backgroundColor: colors.white, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ backgroundColor: colors.primary, padding: '15px 20px', color: 'white', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundImage: 'url(https://i.pravatar.cc/150?img=5)', backgroundSize: 'cover' }}></div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>Dra. Gómez</h4>
                  <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>Geriatra</p>
                </div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: colors.bgLight, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ backgroundColor: 'white', padding: '10px 15px', borderRadius: '15px 15px 15px 0', fontSize: '13px', color: colors.textDark, alignSelf: 'flex-start', maxWidth: '80%' }}>
                  ¿Confirmamos el turno de las 10am?
                </div>
                <div style={{ backgroundColor: colors.secondary, color: 'white', padding: '10px 15px', borderRadius: '15px 15px 0 15px', fontSize: '13px', alignSelf: 'flex-end', maxWidth: '80%' }}>
                  Sí doctora, todo confirmado.
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}