import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantityAuthorized, setQuantityAuthorized] = useState(1);
  const [prescriptionDate, setPrescriptionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isEditingType, setIsEditingType] = useState(false);
  const [editType, setEditType] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!selectedItem) {
      setWarningMessage(null);
      return;
    }
    
    const checkLastPrescription = async () => {
      try {
        const res = await api.get(`/patients/${id}/items/${selectedItem}/last-prescription`);
        if (res.data && res.data.datePrescribed) {
          const lastDate = new Date(res.data.datePrescribed);
          const now = new Date(prescriptionDate + 'T12:00:00');
          const diffTime = Math.abs(now.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays < 20) {
            setWarningMessage(`⚠️ Última dispensa hace ${diffDays} días (${format(lastDate, 'dd/MM/yyyy')}). Posible tope por mes.`);
          } else {
            setWarningMessage(null);
          }
        } else {
          setWarningMessage(null);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkLastPrescription();
  }, [selectedItem, prescriptionDate, id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patientRes, historyRes, itemsRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/history`),
        api.get(`/items`)
      ]);
      setPatient(patientRes.data);
      setHistory(historyRes.data);
      setItems(itemsRes.data);
      setEditType(patientRes.data.patientType);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateType = async () => {
    try {
      await api.put(`/patients/${id}`, { 
        patientType: editType,
        dni: editDni,
        firstName: editFirstName,
        lastName: editLastName
      });
      setPatient({ ...patient, patientType: editType, dni: editDni, firstName: editFirstName, lastName: editLastName });
      setIsEditingType(false);
    } catch (err) {
      alert("Error al actualizar paciente");
    }
  };

  const handleDeletePatient = async () => {
    if (!window.confirm('¿Está seguro de que desea eliminar este paciente y todas sus recetas? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/patients/${id}`);
      navigate('/dashboard');
    } catch (err) {
      alert("Error al eliminar paciente");
    }
  };

  const handleDeletePrescription = async (prescriptionId: string) => {
    if (!window.confirm('¿Eliminar esta receta?')) return;
    try {
      await api.delete(`/prescriptions/${prescriptionId}`);
      fetchData(); // reload
    } catch (err) {
      alert("Error al eliminar receta");
    }
  };

  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || quantity < 1 || !prescriptionDate || quantityAuthorized < 0) return;
    try {
      await api.post('/prescriptions', {
        patientId: id,
        itemId: selectedItem,
        datePrescribed: new Date(prescriptionDate + 'T12:00:00').toISOString(),
        quantityPrescribed: quantity,
        quantityAuthorized: quantityAuthorized
      });
      setSelectedItem('');
      setQuantity(1);
      setQuantityAuthorized(1);
      setPrescriptionDate(format(new Date(), 'yyyy-MM-dd'));
      fetchData(); // reload history
    } catch (err) {
      alert("Error al cargar la receta");
    }
  };

  if (loading) return <div className="container flex-center">Cargando...</div>;
  if (!patient) return <div className="container">Paciente no encontrado</div>;

  return (
    <div className="container">
      <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ background: 'transparent', padding: 0, marginBottom: '2rem' }}>
        <ArrowLeft size={20} /> Volver
      </button>

      <div className="grid-2">
        <div>
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            {!isEditingType ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', wordBreak: 'break-word' }}>{patient.lastName} {patient.firstName}</h2>
                  <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>DNI: {patient.dni}</span> | <span>Tipo: <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{patient.patientType.replace('_', ' ')}</span></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <button onClick={() => {
                     setEditType(patient.patientType);
                     setEditDni(patient.dni);
                     setEditFirstName(patient.firstName);
                     setEditLastName(patient.lastName);
                     setIsEditingType(true);
                   }} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'var(--primary)' }}>Editar</button>
                   <button onClick={handleDeletePatient} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#ef4444' }}>Eliminar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input className="input-glass" value={editLastName} onChange={e => setEditLastName(e.target.value)} placeholder="Apellido" />
                <input className="input-glass" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} placeholder="Nombre" />
                <input className="input-glass" value={editDni} onChange={e => setEditDni(e.target.value)} placeholder="DNI" />
                  <select className="input-glass" value={editType} onChange={(e) => setEditType(e.target.value)}>
                  <option value="TIPO_1">TIPO 1</option>
                  <option value="TIPO_2">TIPO 2</option>
                  <option value="NINOS">NIÑOS</option>
                  <option value="ADOLESCENTES">ADOLESCENTES</option>
                  <option value="BOMBA">BOMBA</option>
                  <option value="CARDIOPATA">CARDIÓPATA</option>
                  <option value="EMBARAZADAS">EMBARAZADAS</option>
                </select>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={handleUpdateType} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Guardar</button>
                  <button onClick={() => setIsEditingType(false)} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--card-border)' }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={20} color="var(--primary)" /> Nueva Receta
            </h3>
            <form onSubmit={handleAddPrescription} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Fecha</label>
                <input 
                  type="date" 
                  className="input-glass" 
                  value={prescriptionDate}
                  onChange={(e) => setPrescriptionDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Medicamento / Insumo</label>
                <select 
                  className="input-glass" 
                  value={selectedItem} 
                  onChange={(e) => setSelectedItem(e.target.value)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cantidad Indicada</label>
                <input 
                  type="number" 
                  min="1"
                  className="input-glass" 
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(val);
                    if (quantityAuthorized > val) setQuantityAuthorized(val); // Keep authorized <= indicated as a convenience, they can change it
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cantidad Autorizada / Dispensada</label>
                <input 
                  type="number" 
                  min="0"
                  className="input-glass" 
                  value={quantityAuthorized}
                  onChange={(e) => setQuantityAuthorized(parseInt(e.target.value) || 0)}
                  required
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Si autorizas 0, se marcará como Rechazado (Rojo).
                </small>
              </div>
              
              {warningMessage && (
                <div style={{ backgroundColor: 'rgba(255, 165, 0, 0.2)', color: '#ffb74d', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
                  {warningMessage}
                </div>
              )}
              
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Registrar</button>
            </form>
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Historial Clínico</h3>
          {history.length === 0 ? (
            <div className="glass-panel">
              <p style={{ color: 'var(--text-muted)' }}>No hay recetas registradas.</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <div className="table-responsive" style={{ overflowY: 'auto', flex: 1 }}>
                <table className="history-table" style={{ margin: 0, width: '100%' }}>
                  <thead style={{ background: 'rgba(0,0,0,0.5)', position: 'sticky', top: 0, zIndex: 1, backdropFilter: 'blur(10px)' }}>
                    <tr>
                      <th>Fecha</th>
                      <th>Insumo</th>
                      <th>Cant.</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id} className="history-row">
                        <td style={{ borderTop: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{format(new Date(h.datePrescribed), 'dd/MM/yyyy')}</td>
                        <td style={{ borderTop: '1px solid var(--card-border)' }}>{h.item.name}</td>
                        <td style={{ borderTop: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>{h.quantityAuthorized} / {h.quantityPrescribed}</td>
                        <td style={{ borderTop: '1px solid var(--card-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span className={`status-${h.status}`}>
                              {h.status === 'AUTHORIZED' && 'Aprobado'}
                              {h.status === 'PARTIAL' && 'Tope'}
                              {h.status === 'DENIED' && 'Rechazado'}
                            </span>
                            <button 
                              onClick={() => handleDeletePrescription(h.id)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
