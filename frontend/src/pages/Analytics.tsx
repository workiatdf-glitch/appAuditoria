import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Activity, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Cell, Treemap
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16'];

const CustomizedContent = (props: any) => {
  const { depth, x, y, width, height, index, name } = props;
  
  if (depth !== 1) { 
      return null; 
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: '#0f172a',
          strokeWidth: 2,
        }}
      />
      {width > 60 && height > 30 ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight={500}
        >
          {name}
        </text>
      ) : null}
    </g>
  );
};

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [items, setItems] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Autocomplete States
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  
  const navigate = useNavigate();

  // Load items and patients for filters
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [itemsRes, patientsRes] = await Promise.all([
          api.get('/items'),
          api.get('/patients')
        ]);
        setItems(itemsRes.data);
        setPatients(patientsRes.data);
      } catch (err) {
        console.error("Error fetching dropdown data", err);
      }
    };
    fetchDropdownData();
  }, []);

  // Autocomplete logic
  useEffect(() => {
    if (!patientSearch.trim()) {
      setFilteredPatients([]);
      return;
    }
    const q = patientSearch.toLowerCase();
    const filtered = patients.filter(p => 
      p.dni.includes(q) || p.lastName.toLowerCase().includes(q) || p.firstName.toLowerCase().includes(q)
    ).slice(0, 5); // Limit to 5
    setFilteredPatients(filtered);
  }, [patientSearch, patients]);


  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      if (selectedItem) params.append('itemId', selectedItem);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPatientId) params.append('patientId', selectedPatientId);
      
      const res = await api.get(`/analytics?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedItem, selectedStatus, selectedPatientId]);

  if (loading && !data) {
    return <div className="flex-center" style={{ height: '100vh' }}><div style={{ color: 'var(--text-muted)' }}>Cargando Estadísticas...</div></div>;
  }

  const treeMapData = data?.itemConsumption?.map((item: any) => ({
    name: item.name,
    size: item.total
  })) || [];

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--card-border)', padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 600 }}>Dashboard Estadístico</h1>
            <p style={{ color: 'var(--text-muted)' }}>Análisis de consumos y prescripciones</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Desde:</span>
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="input-glass" style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.2)' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Hasta:</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="input-glass" style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.2)' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Estado:</span>
              <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="input-glass" style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.2)', width: '120px' }}>
                <option value="">Todas</option>
                <option value="AUTHORIZED">Autorizadas</option>
                <option value="PARTIAL">Parcial (Tope)</option>
                <option value="DENIED">Rechazadas</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Insumo/Droga:</span>
              <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="input-glass" style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.2)', maxWidth: '150px' }}>
                <option value="">Todas</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Paciente:</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    if (e.target.value === '') setSelectedPatientId('');
                  }}
                  placeholder="Buscar paciente..."
                  className="input-glass" 
                  style={{ padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.2)', width: '200px', borderColor: selectedPatientId ? 'var(--primary)' : 'transparent' }} 
                />
                {selectedPatientId && (
                  <button onClick={() => { setSelectedPatientId(''); setPatientSearch(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                    <XCircle size={16} />
                  </button>
                )}
              </div>
              
              {/* Autocomplete Dropdown */}
              {filteredPatients.length > 0 && !selectedPatientId && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid var(--card-border)', borderRadius: '8px', zIndex: 10, marginTop: '4px', overflow: 'hidden' }}>
                  {filteredPatients.map(p => (
                    <div 
                      key={p.id} 
                      style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.875rem' }}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearch(`${p.lastName} ${p.firstName}`);
                        setFilteredPatients([]);
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {p.dni} - {p.lastName} {p.firstName}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '50%' }}>
            <Users size={24} color="#3b82f6" />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pacientes Filtrados</p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>{data?.totalPatients || 0}</h2>
          </div>
        </div>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '50%' }}>
            <CheckCircle size={24} color="#10b981" />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Recetas Autorizadas</p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>{data?.statusCounts?.AUTHORIZED || 0}</h2>
          </div>
        </div>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '1rem', borderRadius: '50%' }}>
            <AlertTriangle size={24} color="#f59e0b" />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tope Mensual (Parcial)</p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>{data?.statusCounts?.PARTIAL || 0}</h2>
          </div>
        </div>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.2)', padding: '1rem', borderRadius: '50%' }}>
            <XCircle size={24} color="#f43f5e" />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Recetas Rechazadas</p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>{data?.statusCounts?.DENIED || 0}</h2>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--primary)" /> Mapa de Consumo por Insumo
          </h3>
          <div style={{ height: 350 }}>
            {treeMapData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={treeMapData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill="#8884d8"
                  content={<CustomizedContent />}
                >
                  <RechartsTooltip 
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any, _name: any, props: any) => [value, props.payload.name]}
                  />
                </Treemap>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No hay datos para mostrar con estos filtros</div>
            )}
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 500 }}>Evolución Temporal de Insumos</h3>
          <div style={{ height: 350 }}>
            {data?.timeEvolution?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.timeEvolution || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tickMargin={10} />
                  <YAxis stroke="var(--text-muted)" tickMargin={10} />
                  <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                  <Line type="monotone" name="Cantidad" dataKey="total" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No hay datos para mostrar con estos filtros</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 500 }}>Top 10 Pacientes con Mayor Consumo (Cantidades)</h3>
        <div style={{ height: 400 }}>
          {data?.topPatients?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.topPatients || []} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="var(--text-muted)" />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" width={180} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="total" name="Cantidad" radius={[0, 4, 4, 0]}>
                  {(data?.topPatients || []).map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)' }}>No hay datos para mostrar con estos filtros</div>
          )}
        </div>
      </div>
    </div>
  );
}
