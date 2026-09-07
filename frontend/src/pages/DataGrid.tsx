import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowLeft } from 'lucide-react';
import api from '../api'; // Use our api instance which sets the token

interface GridItem {
  id: string;
  name: string;
}

interface PrescriptionCell {
  id: string;
  datePrescribed: string;
  quantityAuthorized: number;
  status: string;
}

interface GridRow {
  id: string;
  dni: string;
  name: string;
  patientType: string;
  items: Record<string, PrescriptionCell[]>;
}

export default function DataGrid() {
  const [items, setItems] = useState<GridItem[]>([]);
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const navigate = useNavigate();

  const fetchGrid = async () => {
    try {
      const query = new URLSearchParams();
      if (startDate) query.append('startDate', startDate);
      if (endDate) query.append('endDate', endDate);

      const res = await api.get(`/datagrid?${query.toString()}`);
      setItems(res.data.items || []);
      setGrid(res.data.grid || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGrid();
  }, [startDate, endDate]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'AUTHORIZED': return '#92D050'; // Green
      case 'PARTIAL': return '#FF99CC'; // Pink
      case 'DENIED': return '#FF0000'; // Red
      default: return 'transparent';
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  const renderCellContent = (prescriptions: PrescriptionCell[]) => {
    if (!prescriptions || prescriptions.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
        {prescriptions.map((rx, idx) => (
          <span 
            key={rx.id} 
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              backgroundColor: getStatusColor(rx.status),
              color: rx.status === 'DENIED' ? 'white' : 'black',
              fontWeight: 500
            }}
            title={`Estado: ${rx.status}`}
          >
            ({rx.quantityAuthorized}) {formatDate(rx.datePrescribed)}{idx < prescriptions.length - 1 ? ',' : ''}
          </span>
        ))}
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  return (
    <div className="container" style={{ maxWidth: '100%', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600 }}>Planilla Virtual</h1>
          <p style={{ color: 'var(--text-muted)' }}>Vista integral de base de datos estilo Excel</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="input-glass"
            style={{ width: '150px' }}
            title="Fecha Inicio"
          />
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="input-glass"
            style={{ width: '150px' }}
            title="Fecha Fin"
          />
          <button 
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="btn-primary"
            style={{ background: 'var(--primary)' }}
          >
            Ver Todo
          </button>

          <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)' }}>
            <ArrowLeft size={18} /> Volver
          </button>
          <button onClick={handleLogout} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)' }}>
            <LogOut size={18} /> Salir
          </button>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="history-table" style={{ margin: 0, borderSpacing: 0, width: '100%' }}>
            <thead style={{ background: 'rgba(0,0,0,0.4)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
              <tr>
                <th style={{ padding: '1rem', minWidth: '250px', position: 'sticky', left: 0, background: '#1a1a2e', zIndex: 20 }}>PACIENTE</th>
                <th style={{ padding: '1rem', minWidth: '120px', position: 'sticky', left: '250px', background: '#1a1a2e', zIndex: 20 }}>DNI</th>
                {items.map(item => (
                  <th key={item.id} style={{ padding: '1rem', minWidth: '150px', textAlign: 'center' }}>
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map(row => (
                <tr key={row.id} className="history-row">
                  <td 
                    style={{ padding: '1rem', position: 'sticky', left: 0, background: '#131322', zIndex: 10, cursor: 'pointer', borderTop: '1px solid var(--card-border)' }}
                    onClick={() => navigate(`/patient/${row.id}`)}
                  >
                    <span style={{ color: '#93c5fd' }}>{row.name}</span>
                  </td>
                  <td style={{ padding: '1rem', position: 'sticky', left: '250px', background: '#131322', zIndex: 10, borderTop: '1px solid var(--card-border)' }}>
                    {row.dni}
                  </td>
                  {items.map(item => (
                    <td key={item.id} style={{ padding: '0.5rem', textAlign: 'center', borderTop: '1px solid var(--card-border)' }}>
                      {renderCellContent(row.items[item.id])}
                    </td>
                  ))}
                </tr>
              ))}
              {grid.length === 0 && (
                <tr>
                  <td colSpan={items.length + 2} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay datos para mostrar en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
