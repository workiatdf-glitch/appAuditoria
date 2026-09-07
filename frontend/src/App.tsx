import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientProfile from './pages/PatientProfile';
import AdminPanel from './pages/AdminPanel';
import { useState, useEffect } from 'react';

import Analytics from './pages/Analytics';
import DataGrid from './pages/DataGrid';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState<string>(localStorage.getItem('role') || 'USER');

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
      setUserRole(localStorage.getItem('role') || 'USER');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={() => setIsAuthenticated(true)} />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/analytics" element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />} />
        <Route path="/datagrid" element={isAuthenticated ? <DataGrid /> : <Navigate to="/login" />} />
        <Route path="/patient/:id" element={isAuthenticated ? <PatientProfile /> : <Navigate to="/login" />} />
        <Route path="/users" element={isAuthenticated && userRole === 'ADMIN' ? <AdminPanel /> : <Navigate to="/dashboard" />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
