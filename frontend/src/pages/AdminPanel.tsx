import { useState, useEffect } from 'react';
import api from '../api';
import { Users, Plus, Trash2, Key, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        navigate('/dashboard'); // Not admin
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', { username, password, role });
      setShowModal(false);
      setUsername('');
      setPassword('');
      setRole('USER');
      fetchUsers();
    } catch (err) {
      alert('Error creando usuario. ¿Quizás ya existe?');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert('Error al eliminar');
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      setShowPasswordModal(false);
      setNewPassword('');
      alert('Contraseña actualizada con éxito');
    } catch (err) {
      alert('Error al cambiar contraseña');
    }
  };

  return (
    <div className="container">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={18} /> Volver
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="var(--primary)" />
            Panel Admin
          </h1>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nuevo Usuario
        </button>
      </header>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="history-table" style={{ margin: 0, width: '100%' }}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Creado en</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.username}</td>
                <td>
                  <span style={{ 
                    background: u.role === 'ADMIN' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.1)',
                    color: u.role === 'ADMIN' ? 'var(--primary)' : 'inherit',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {u.role}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '0.5rem', marginRight: '0.5rem', background: 'transparent' }}
                    title="Cambiar contraseña"
                    onClick={() => { setSelectedUser(u); setShowPasswordModal(true); }}
                  >
                    <Key size={18} />
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '0.5rem', background: 'transparent', color: 'var(--status-red-text)' }}
                    title="Eliminar usuario"
                    onClick={() => handleDelete(u.id)}
                    disabled={u.username === 'admin'}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Crear Usuario</h2>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '0.5rem' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Nombre de Usuario</label>
                <input type="text" className="input-glass" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div>
                <label>Contraseña</label>
                <input type="password" className="input-glass" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div>
                <label>Rol</label>
                <select className="input-glass" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="USER">Usuario (Solo visualizar y cargar)</option>
                  <option value="ADMIN">Administrador (Acceso total)</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Guardar Usuario</button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Cambiar Contraseña: {selectedUser?.username}</h2>
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary" style={{ padding: '0.5rem' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Nueva Contraseña</label>
                <input type="password" className="input-glass" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Actualizar Contraseña</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
