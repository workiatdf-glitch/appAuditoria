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
    <div className="container" style={{ maxWidth: '100%' }}>
      <header className="app-header">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600 }}>Planilla Virtual</h1>
          <p style={{ color: 'var(--text-muted)' }}>Vista integral de base de datos estilo Excel</p>
        </div>
        <div className="datagrid-header-controls" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="datagrid-date-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="input-glass"
              style={{ width: '140px', padding: '8px 10px', fontSize: '0.85rem' }}
              title="Fecha Inicio"
            />
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="input-glass"
              style={{ width: '140px', padding: '8px 10px', fontSize: '0.85rem' }}
              title="Fecha Fin"
            />
          </div>
          <div className="datagrid-btn-row" style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="btn-primary"
              style={{ background: 'var(--primary)', padding: '8px 12px', fontSize: '0.85rem' }}
            >
              Ver Todo
            </button>

            <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)', padding: '8px 12px', fontSize: '0.85rem' }}>
              <ArrowLeft size={16} /> Volver
            </button>
            <button onClick={handleLogout} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)', padding: '8px 12px', fontSize: '0.85rem' }}>
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>Total filas: {grid.length}</span>
        <span>👉 Desliza para explorar insumos</span>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 220px)' }}>
        <div className="table-responsive" style={{ overflow: 'auto', flex: 1 }}>
          <table className="history-table" style={{ margin: 0, borderSpacing: 0, width: '100%' }}>
            <thead style={{ background: 'rgba(0,0,0,0.6)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
              <tr>
                <th className="datagrid-col-patient" style={{ padding: '0.75rem', minWidth: '220px', position: 'sticky', left: 0, background: '#1a1a2e', zIndex: 20 }}>PACIENTE</th>
                <th className="datagrid-col-dni" style={{ padding: '0.75rem', minWidth: '110px', position: 'sticky', left: '220px', background: '#1a1a2e', zIndex: 20 }}>DNI</th>
                {items.map(item => (
                  <th key={item.id} style={{ padding: '0.75rem', minWidth: '140px', textAlign: 'center' }}>
                    {item.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map(row => (
                <tr key={row.id} className="history-row">
                  <td 
                    className="datagrid-col-patient"
                    style={{ padding: '0.75rem', position: 'sticky', left: 0, background: '#131322', zIndex: 10, cursor: 'pointer', borderTop: '1px solid var(--card-border)' }}
                    onClick={() => navigate(`/patient/${row.id}`)}
                  >
                    <span style={{ color: '#93c5fd', fontWeight: 500 }}>{row.name}</span>
                  </td>
                  <td 
                    className="datagrid-col-dni"
                    style={{ padding: '0.75rem', position: 'sticky', left: '220px', background: '#131322', zIndex: 10, borderTop: '1px solid var(--card-border)' }}
                  >
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
