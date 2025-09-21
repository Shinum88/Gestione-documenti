import React, { useState, useRef } from 'react';
import { toast } from 'sonner';

const TransporterManager = ({ 
  transporters, 
  setTransporters, 
  onClose, 
  onSelectTransporter 
}) => {
  const [newTransporter, setNewTransporter] = useState({ name: '', company: '' });
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef(null);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    // Background bianco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  React.useEffect(() => {
    if (isDrawingSignature && canvasRef.current) {
      initializeCanvas();
    }
  }, [isDrawingSignature]);

  const getEventPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getEventPos(e);
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const pos = getEventPos(e);
    const ctx = canvasRef.current.getContext('2d');
    
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    setHasSignature(true);
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
  };

  const saveTransporter = () => {
    if (!newTransporter.name.trim() || !newTransporter.company.trim()) {
      toast.error('Inserisci nome e trasportatore');
      return;
    }

    if (!hasSignature) {
      toast.error('Inserisci la firma del trasportatore');
      return;
    }

    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');

    const transporterData = {
      id: Date.now().toString(),
      name: newTransporter.name.trim(),
      company: newTransporter.company.trim(),
      signature: signatureData,
      createdAt: new Date().toISOString()
    };

    // Salva in localStorage e aggiorna stato
    const updatedTransporters = [...transporters, transporterData];
    localStorage.setItem('transporters', JSON.stringify(updatedTransporters));
    setTransporters(updatedTransporters);
    
    // Reset form
    setNewTransporter({ name: '', company: '' });
    setIsDrawingSignature(false);
    setHasSignature(false);
    
    toast.success('Trasportatore registrato con successo');
  };

  const deleteTransporter = (transporterId) => {
    const updatedTransporters = transporters.filter(t => t.id !== transporterId);
    localStorage.setItem('transporters', JSON.stringify(updatedTransporters));
    setTransporters(updatedTransporters);
    toast.success('Trasportatore eliminato');
  };

  return (
    <div className="signature-modal">
      <div className="signature-container" style={{ maxWidth: '800px', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="signature-title">Gestione Trasportatori</h2>
          <button 
            className="btn-clear"
            onClick={onClose}
            style={{ background: '#6b7280', padding: '0.5rem 1rem' }}
          >
            ✕ Chiudi
          </button>
        </div>

        {/* Form nuovo trasportatore */}
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#374151', fontSize: '1.1rem' }}>
            Nuovo Trasportatore
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Nome Trasportatore
              </label>
              <input
                type="text"
                value={newTransporter.name}
                onChange={(e) => setNewTransporter(prev => ({ ...prev, name: e.target.value }))}
                className="form-input"
                placeholder="Nome e cognome"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                Azienda/Trasportatore
              </label>
              <input
                type="text"
                value={newTransporter.company}
                onChange={(e) => setNewTransporter(prev => ({ ...prev, company: e.target.value }))}
                className="form-input"
                placeholder="Nome azienda"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {!isDrawingSignature ? (
            <button 
              className="btn-secondary"
              onClick={() => setIsDrawingSignature(true)}
              style={{ background: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', width: '100%' }}
            >
              ✍️ Aggiungi Firma
            </button>
          ) : (
            <div>
              <p style={{ marginBottom: '1rem', color: '#64748b', textAlign: 'center' }}>
                Disegna la firma del trasportatore
              </p>
              
              <canvas
                ref={canvasRef}
                className="signature-canvas"
                width={500}
                height={150}
                style={{ width: '100%', height: '150px', maxWidth: '500px', display: 'block', margin: '0 auto' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button className="btn-clear" onClick={clearSignature}>
                  🗑️ Cancella
                </button>
                <button className="btn-save" onClick={saveTransporter}>
                  ✓ Salva Trasportatore
                </button>
                <button 
                  className="btn-clear" 
                  onClick={() => {
                    setIsDrawingSignature(false);
                    setHasSignature(false);
                  }}
                  style={{ background: '#6b7280' }}
                >
                  ✕ Annulla
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista trasportatori registrati */}
        <div>
          <h3 style={{ marginBottom: '1rem', color: '#374151', fontSize: '1.1rem' }}>
            Trasportatori Registrati ({transporters.length})
          </h3>
          
          {transporters.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
              Nessun trasportatore registrato
            </p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {transporters.map(transporter => (
                <div 
                  key={transporter.id}
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem' }}>
                      {transporter.name}
                    </h4>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                      {transporter.company}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>
                      Registrato: {new Date(transporter.createdAt).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img 
                      src={transporter.signature} 
                      alt="Firma"
                      style={{ 
                        width: '100px', 
                        height: '40px', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        objectFit: 'contain',
                        background: 'white'
                      }}
                    />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {onSelectTransporter && (
                        <button
                          className="btn-secondary"
                          onClick={() => onSelectTransporter(transporter)}
                          style={{ 
                            background: '#10b981', 
                            color: 'white', 
                            padding: '0.5rem 1rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          Seleziona
                        </button>
                      )}
                      <button
                        className="btn-clear"
                        onClick={() => deleteTransporter(transporter.id)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransporterManager;