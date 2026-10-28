import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const name  = localStorage.getItem('userName');
    if (token && role) { setIsAuthenticated(true); setUserRole(role); setUserName(name); }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleLogin = (role, name) => { setIsAuthenticated(true); setUserRole(role); setUserName(name); };
  const handleLogout = () => { localStorage.clear(); setIsAuthenticated(false); setUserRole(null); setUserName(''); };

  if (!isAuthenticated) return <Login onLogin={handleLogin} />;

  const dashProps = { userName, onLogout: handleLogout, dark, onToggleDark: () => setDark(d => !d) };

  return (
    <>
      {userRole === 'student' && <StudentDashboard {...dashProps} />}
      {userRole === 'staff'   && <StaffDashboard   {...dashProps} />}
      {userRole === 'admin'   && <AdminDashboard   {...dashProps} />}
    </>
  );
}

export default App;
