import React, { useRef, useEffect, useState } from 'react';

const SignatureCanvas = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
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
  }, []);

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

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
  };

  const saveSignature = () => {
    if (!hasSignature) {
      alert('Inserisci una firma prima di salvare');
      return;
    }
    
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="signature-modal">
      <div className="signature-container">
        <h2 className="signature-title">Inserisci la tua firma</h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1rem' }}>
          La firma verrà applicata solo alla prima pagina del documento
        </p>
        
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          width={500}
          height={200}
          style={{ width: '100%', height: '200px', maxWidth: '500px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        <div className="signature-controls">
          <button className="btn-clear" onClick={clearCanvas}>
            🗑️ Cancella
          </button>
          <button className="btn-save" onClick={saveSignature}>
            ✓ Salva Firma
          </button>
          <button 
            className="btn-clear" 
            onClick={onCancel}
            style={{ background: '#6b7280' }}
          >
            ✕ Annulla
          </button>
        </div>
        
        <p style={{ 
          textAlign: 'center', 
          fontSize: '0.8rem', 
          color: '#9ca3af', 
          marginTop: '1rem' 
        }}>
          Disegna la firma usando il mouse o il touch
        </p>
      </div>
    </div>
  );
};

export default SignatureCanvas;