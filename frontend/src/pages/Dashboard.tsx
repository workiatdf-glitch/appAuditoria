import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search, UserPlus, LogOut, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [displayedPatients, setDisplayedPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const res = await api.get('/patients');
        setAllPatients(res.data);
        setDisplayedPatients(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDisplayedPatients(allPatients);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const filtered = allPatients.filter(p => 
      p.dni.includes(q) || 
      p.lastName.toLowerCase().includes(q) || 
      p.firstName.toLowerCase().includes(q)
    );
    setDisplayedPatients(filtered);
  }, [searchQuery, allPatients]);

  const handleCreatePatient = async () => {
    const isNumeric = /^\\d+$/.test(searchQuery.trim());
    let newDni = searchQuery.trim();
    if (!isNumeric) {
      newDni = prompt("DNI del paciente:") || '';
      if (!newDni) return;
    }
    const firstName = prompt("Nombre:");
    const lastName = prompt("Apellido:");
    if (!firstName || !lastName) return;
    try {
      const res = await api.post('/patients', { dni: newDni, firstName, lastName });
      navigate(`/patient/${res.data.id}`);
    } catch (err) {
      alert("Error al crear paciente");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600 }}>Pacientes</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestión de recetas e insumos</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/datagrid')} className="btn-primary" style={{ background: 'var(--primary)' }}>
            Planilla Virtual
          </button>
          <button onClick={() => navigate('/analytics')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)' }}>
            Estadísticas
          </button>
          {localStorage.getItem('role') === 'ADMIN' && (
            <button onClick={() => navigate('/users')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)' }}>
              Panel Admin
            </button>
          )}
          <button onClick={handleLogout} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)' }}>
            <LogOut size={18} /> Salir
          </button>
        </div>
      </header>

      <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-glass" 
              placeholder="Buscar por DNI o Nombre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
          </div>
          <button onClick={handleCreatePatient} className="btn-primary" title="Crear nuevo paciente">
            <UserPlus size={18} /> <span style={{ display: 'inline' }}>Nuevo</span>
          </button>
        </div>
      </div>

      {displayedPatients.length === 0 && !loading && searchQuery && (
        <div className="glass-panel flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No se encontró ningún paciente que coincida con "{searchQuery}"</p>
          <button onClick={handleCreatePatient} className="btn-primary">
            <UserPlus size={18} /> Crear nuevo paciente
          </button>
        </div>
      )}

      {displayedPatients.length > 0 && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
          <div className="table-responsive" style={{ overflowY: 'auto', flex: 1 }}>
            <table className="history-table" style={{ margin: 0, borderSpacing: 0, width: '100%' }}>
              <thead style={{ background: 'rgba(0,0,0,0.5)', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(10px)' }}>
                <tr>
                  <th>DNI</th>
                  <th>Nombre Completo</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {displayedPatients.map(p => (
                  <tr key={p.id} className="history-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/patient/${p.id}`)}>
                    <td style={{ borderRadius: 0, borderTop: '1px solid var(--card-border)', borderBottom: 'none', borderLeft: 'none', fontWeight: 500 }}>{p.dni}</td>
                    <td style={{ borderTop: '1px solid var(--card-border)', borderBottom: 'none' }}>{p.lastName} {p.firstName}</td>
                    <td style={{ borderTop: '1px solid var(--card-border)', borderBottom: 'none' }}>
                      <span style={{ padding: '3px 8px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {p.patientType.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', borderRadius: 0, borderTop: '1px solid var(--card-border)', borderBottom: 'none', borderRight: 'none' }}>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
