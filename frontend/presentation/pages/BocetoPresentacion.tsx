export default function BocetoPresentacion() {
  return (
    <div style={{ 
      backgroundColor: '#000000', 
      color: '#ffffff', 
      minHeight: '100vh', 
      padding: '60px 40px', 
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '60px' }}>
          1. Así vamos a plantear la interfaz
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
          
          {/* Item 1: Inicio de Sesión */}
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <div style={{ 
              width: '280px', 
              height: '180px', 
              backgroundColor: '#111', 
              borderRadius: '16px', 
              border: '1px solid #333',
              display: 'flex',
              overflow: 'hidden'
            }}>
              <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '20px' }}>
                <div style={{ width: '60%', height: '10px', backgroundColor: '#334155', borderRadius: '4px', marginBottom: '10px' }}></div>
                <div style={{ width: '80%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px' }}></div>
              </div>
              <div style={{ flex: 1, backgroundColor: '#ffffff', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                <div style={{ width: '100%', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}></div>
                <div style={{ width: '100%', height: '20px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}></div>
                <div style={{ width: '100%', height: '25px', backgroundColor: '#1fb5b2', borderRadius: '4px', marginTop: '10px' }}></div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#ffffff' }}>1. Inicio de sesión</h2>
              <p style={{ margin: 0, color: '#a1a1aa', fontSize: '15px', lineHeight: '1.5' }}>
                Pantalla de bienvenida con identidad visual, usuario, contraseña y validación de acceso.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#1f1f1f', width: '100%' }}></div>

          {/* Item 2: Panel de Administración */}
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <div style={{ 
              width: '280px', 
              height: '180px', 
              backgroundColor: '#ffffff', 
              borderRadius: '16px', 
              border: '1px solid #333',
              display: 'flex'
            }}>
              <div style={{ width: '50px', backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '10px' }}>
                 <div style={{ width: '100%', height: '10px', backgroundColor: '#cbd5e1', borderRadius: '2px', marginBottom: '10px' }}></div>
                 <div style={{ width: '100%', height: '10px', backgroundColor: '#cbd5e1', borderRadius: '2px' }}></div>
              </div>
              <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, height: '40px', backgroundColor: '#1fb5b2', borderRadius: '6px' }}></div>
                    <div style={{ flex: 1, height: '40px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}></div>
                    <div style={{ flex: 1, height: '40px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}></div>
                 </div>
                 <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '6px' }}></div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#ffffff' }}>2. Panel de administración</h2>
              <p style={{ margin: 0, color: '#a1a1aa', fontSize: '15px', lineHeight: '1.5' }}>
                Menú lateral, resumen de profesionales, búsquedas, registros y gestión de usuarios y roles.
              </p>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#1f1f1f', width: '100%' }}></div>

          {/* Item 3: Gestión de Profesionales */}
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <div style={{ 
              width: '280px', 
              height: '180px', 
              backgroundColor: '#ffffff', 
              borderRadius: '16px', 
              border: '1px solid #333',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ height: '40px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 15px' }}>
                 <div style={{ width: '100px', height: '15px', backgroundColor: '#f1f5f9', borderRadius: '4px' }}></div>
              </div>
              <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <div style={{ width: '100%', height: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}></div>
                 <div style={{ width: '100%', height: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}></div>
                 <div style={{ width: '100%', height: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', margin: '0 0 10px 0', color: '#ffffff' }}>3. Gestión de profesionales</h2>
              <p style={{ margin: 0, color: '#a1a1aa', fontSize: '15px', lineHeight: '1.5' }}>
                Registrar, consultar, listar, editar, activar, desactivar y eliminar profesionales, con formularios y confirmaciones.
              </p>
            </div>
          </div>

        </div>
        
        {/* Flecha inferior */}
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <div style={{ 
            display: 'inline-flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            border: '1px solid #333' 
          }}>
            ↓
          </div>
        </div>

      </div>
    </div>
  );
}