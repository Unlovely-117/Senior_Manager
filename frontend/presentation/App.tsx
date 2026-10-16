import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import ProfessionalsDashboard from './pages/ProfessionalsDashboard';
import ProfessionalForm from './pages/ProfessionalForm';
import BocetoPresentacion from './pages/BocetoPresentacion'; // <-- Importa el boceto

function App() {
  const isAuthenticated = false; 

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Nueva ruta para ver tu boceto */}
        <Route path="/boceto" element={<BocetoPresentacion />} /> 
        
        {isAuthenticated ? (
          <>
            <Route path="/home" element={<Home />} />
            <Route path="/profesionales" element={<ProfessionalsDashboard />} />
            <Route path="/profesionales/nuevo" element={<ProfessionalForm />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;