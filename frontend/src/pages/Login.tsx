import { useState } from 'react';
import api from '../api';
import { Activity } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Silently pre-warm Render backend on page load in case of cold start
  useState(() => {
    api.get('/health').catch(() => {});
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.user.username);
      localStorage.setItem('role', res.data.user.role);
      // Trigger global storage event so App.tsx re-renders
      window.dispatchEvent(new Event('storage'));
      onLogin();
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos. Verifique sus datos.');
      } else {
        setError('Error al conectar con el servidor. Si el servidor estaba en reposo, aguarde unos segundos y vuelva a presionar Ingresar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100dvh', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Activity size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Control Diabetes</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Ingresa con tus credenciales</p>
        </div>

        {error && (
          <div style={{ background: 'var(--status-red)', color: 'var(--status-red-text)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Usuario</label>
            <input 
              type="text" 
              className="input-glass" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Contraseña</label>
            <input 
              type="password" 
              className="input-glass" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem', minHeight: '44px' }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
