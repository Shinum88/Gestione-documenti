import React, { useState } from 'react';
import { toast } from 'sonner';
import SignatureCanvas from './SignatureCanvas';

/**
 * SignatureModal - Modale avanzato per applicazione firma con opzioni
 * Include: Firma trasportatore registrato, Firma manuale, Numero sigillo
 */
const SignatureModal = ({ 
  onClose, 
  onConfirm, 
  transporters = [] 
}) => {
  const [signatureType, setSignatureType] = useState('registered'); // 'registered' | 'manual'
  const [selectedTransporter, setSelectedTransporter] = useState('');
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [manualSignature, setManualSignature] = useState(null);
  const [sealNumber, setSealNumber] = useState('');
  const [transporterNameForSeal, setTransporterNameForSeal] = useState('');

  const handleConfirm = () => {
    // Validazione
    if (signatureType === 'registered' && !selectedTransporter) {
      toast.error('Seleziona un trasportatore registrato');
      return;
    }

    if (signatureType === 'manual' && !manualSignature) {
      toast.error('Disegna la firma manuale');
      return;
    }

    // Prepara dati firma
    let signatureData = {
      type: signatureType,
      image: null,
      transporterName: '',
    };

    if (signatureType === 'registered') {
      const transporter = transporters.find(t => t.name === selectedTransporter);
      if (!transporter) {
        toast.error('Trasportatore non trovato');
        return;
      }
      signatureData.image = transporter.signature;
      signatureData.transporterName = transporter.name;
    } else {
      signatureData.image = manualSignature;
      signatureData.transporterName = 'Firma Manuale';
    }

    // Aggiungi dati sigillo (opzionale)
    if (sealNumber.trim() || transporterNameForSeal.trim()) {
      signatureData.seal = {
        number: sealNumber.trim(),
        transporterName: transporterNameForSeal.trim() || signatureData.transporterName
      };
    }

    console.log('✅ Firma configurata:', signatureData);
    onConfirm(signatureData);
  };

  const handleManualSignatureStart = () => {
    setShowSignatureCanvas(true);
  };

  const handleManualSignatureSave = (signatureImage) => {
    setManualSignature(signatureImage);
    setShowSignatureCanvas(false);
    toast.success('Firma manuale salvata');
  };

  if (showSignatureCanvas) {
    return (
      <SignatureCanvas
        onSave={handleManualSignatureSave}
        onCancel={() => setShowSignatureCanvas(false)}
      />
    );
  }

  return (
    <div className="signature-modal">
      <div className="signature-container" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="signature-title">Applica Firma Unica</h2>
          <button className="btn-clear" onClick={onClose}>✕</button>
        </div>

        {/* Sezione 1: Tipo Firma */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>
            1. Tipo Firma *
          </h3>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ 
              flex: 1,
              padding: '1rem',
              border: `2px solid ${signatureType === 'registered' ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: signatureType === 'registered' ? '#eff6ff' : 'white',
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                name="signatureType"
                value="registered"
                checked={signatureType === 'registered'}
                onChange={(e) => setSignatureType(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <strong>Trasportatore Registrato</strong>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                Usa firma da gestione trasportatori
              </div>
            </label>

            <label style={{ 
              flex: 1,
              padding: '1rem',
              border: `2px solid ${signatureType === 'manual' ? '#3b82f6' : '#e2e8f0'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: signatureType === 'manual' ? '#eff6ff' : 'white',
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                name="signatureType"
                value="manual"
                checked={signatureType === 'manual'}
                onChange={(e) => setSignatureType(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <strong>Firma Manuale</strong>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                Disegna una nuova firma
              </div>
            </label>
          </div>

          {/* Seleziona trasportatore registrato */}
          {signatureType === 'registered' && (
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Seleziona Trasportatore:
              </label>
              <select
                value={selectedTransporter}
                onChange={(e) => setSelectedTransporter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              >
                <option value="">-- Seleziona trasportatore --</option>
                {transporters.map((transporter) => (
                  <option key={transporter.name} value={transporter.name}>
                    {transporter.name}
                  </option>
                ))}
              </select>
              
              {selectedTransporter && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Anteprima firma:
                  </div>
                  <img 
                    src={transporters.find(t => t.name === selectedTransporter)?.signature} 
                    alt="Firma"
                    style={{ 
                      maxWidth: '300px', 
                      maxHeight: '100px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: 'white'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Disegna firma manuale */}
          {signatureType === 'manual' && (
            <div style={{ marginTop: '1rem' }}>
              {manualSignature ? (
                <div style={{ 
                  padding: '1rem', 
                  background: '#f8fafc', 
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Firma manuale salvata:
                  </div>
                  <img 
                    src={manualSignature} 
                    alt="Firma manuale"
                    style={{ 
                      maxWidth: '300px', 
                      maxHeight: '100px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: 'white'
                    }}
                  />
                  <button 
                    className="btn-secondary" 
                    onClick={handleManualSignatureStart}
                    style={{ marginTop: '0.5rem' }}
                  >
                    🔄 Ridisegna Firma
                  </button>
                </div>
              ) : (
                <button 
                  className="btn-save" 
                  onClick={handleManualSignatureStart}
                >
                  ✍️ Disegna Firma Manuale
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sezione 2: Numero Sigillo (Opzionale) */}
        <div style={{ 
          marginBottom: '2rem',
          padding: '1.5rem',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px'
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#92400e' }}>
            2. Numero Sigillo (Opzionale)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '1rem' }}>
            Il sigillo apparirà sul margine sinistro, alla stessa altezza della firma
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#78350f' }}>
                Nome Trasportatore:
              </label>
              <input
                type="text"
                value={transporterNameForSeal}
                onChange={(e) => setTransporterNameForSeal(e.target.value)}
                placeholder="Es: Rossi Transport"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#78350f' }}>
                N° Sigillo:
              </label>
              <input
                type="text"
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                placeholder="Es: SL-12345"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {(transporterNameForSeal || sealNumber) && (
            <div style={{ 
              padding: '0.75rem',
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #fde68a',
              fontSize: '0.9rem'
            }}>
              <strong>Anteprima sigillo:</strong>
              <div style={{ marginTop: '0.25rem', color: '#78350f' }}>
                {transporterNameForSeal || '(Nome trasportatore)'}
                {sealNumber && ` - Sigillo: ${sealNumber}`}
              </div>
            </div>
          )}
        </div>

        {/* Pulsanti */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn-clear" onClick={onClose}>
            Annulla
          </button>
          <button 
            className="btn-save" 
            onClick={handleConfirm}
            disabled={
              (signatureType === 'registered' && !selectedTransporter) ||
              (signatureType === 'manual' && !manualSignature)
            }
          >
            ✅ Applica Firma a Documenti Selezionati
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
