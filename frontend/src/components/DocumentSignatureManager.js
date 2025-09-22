import React, { useState } from 'react';
import DocumentPreview, { useDocumentProcessor } from './DocumentPreview';
import SignatureCanvas from './SignatureCanvas';
import { toast } from 'sonner';

const DocumentSignatureManager = ({ 
  documents, 
  transporters,
  onDocumentsProcessed,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState('preview'); // 'preview', 'signature', 'processing'
  const [selectedTransporter, setSelectedTransporter] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [signature, setSignature] = useState(null);
  const [processedDocuments, setProcessedDocuments] = useState([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);

  const { generateProcessedPDF } = useDocumentProcessor();
  const currentDocument = documents[currentDocIndex];

  // Error handling - if no documents or current document is undefined
  if (!documents || documents.length === 0 || !currentDocument) {
    return (
      <div className="signature-modal">
        <div className="signature-container" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 className="signature-title">Errore</h2>
          <p>Nessun documento disponibile per il processamento.</p>
          <button className="btn-clear" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  const handleTransporterSelect = (transporterId) => {
    setSelectedTransporter(transporterId);
    const transporter = transporters.find(t => t.id === transporterId);
    if (transporter) {
      setSignature(transporter.signature);
    }
  };

  const handleCustomSignature = () => {
    setCurrentStep('signature');
  };

  const handleSignatureSave = (signatureData) => {
    setSignature(signatureData);
    setCurrentStep('preview');
    toast.success('Firma personalizzata salvata');
  };

  const processCurrentDocument = async () => {
    if (!signature) {
      toast.error('Seleziona un trasportatore o crea una firma');
      return;
    }

    if (!currentDocument || !currentDocument.pages || !currentDocument.pages[0]) {
      toast.error('Documento non valido o pagine mancanti');
      return;
    }

    const selectedTransporterData = transporters.find(t => t.id === selectedTransporter);
    const transporterName = selectedTransporterData ? 
      `${selectedTransporterData.name}` : 
      'Firma Personalizzata';

    setCurrentStep('processing');

    try {
      // Processo la prima pagina del documento  
      const processedFirstPage = await generateProcessedPDF(
        currentDocument.pages[0],
        signature,
        sealNumber || null,
        transporterName
      );

      // Crea il documento processato
      const processedDoc = {
        ...currentDocument,
        pages: [processedFirstPage, ...currentDocument.pages.slice(1)], // Prima pagina processata + resto
        signed: true,
        signature: { image: signature },
        sealNumber: sealNumber || null,
        transporterName: selectedTransporterData?.name || 'Personalizzata',
        transporterCompany: selectedTransporterData?.company || '',
        signedAt: new Date().toISOString()
      };

      const updatedProcessed = [...processedDocuments, processedDoc];
      setProcessedDocuments(updatedProcessed);

      // Passa al documento successivo o completa il processo
      if (currentDocIndex < documents.length - 1) {
        setCurrentDocIndex(currentDocIndex + 1);
        setCurrentStep('preview');
        // Reset per nuovo documento
        setSelectedTransporter('');
        setSealNumber('');
        setSignature(null);
        toast.success(`Documento ${currentDocIndex + 1} processato. Prossimo documento...`);
      } else {
        // Tutti i documenti processati
        onDocumentsProcessed(updatedProcessed);
        toast.success(`Tutti i ${documents.length} documenti sono stati processati!`);
      }

    } catch (error) {
      console.error('Errore nel processamento documento:', error);
      toast.error('Errore durante il processamento del documento');
      setCurrentStep('preview');
    }
  };

  const skipCurrentDocument = () => {
    if (currentDocIndex < documents.length - 1) {
      setCurrentDocIndex(currentDocIndex + 1);
      toast.info(`Documento ${currentDocIndex + 1} saltato`);
    } else {
      onDocumentsProcessed(processedDocuments);
      toast.success('Processamento completato');
    }
  };

  if (currentStep === 'signature') {
    return (
      <div className="signature-modal">
        <div className="signature-container">
          <SignatureCanvas
            onSave={handleSignatureSave}
            onCancel={() => setCurrentStep('preview')}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'processing') {
    return (
      <div className="signature-modal">
        <div className="signature-container" style={{ textAlign: 'center' }}>
          <h2 className="signature-title">Processamento Documento</h2>
          <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
          <p>Applicazione firma e strutturazione A4 in corso...</p>
          <p style={{ color: '#64748b' }}>
            Documento {currentDocIndex + 1} di {documents.length}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="signature-modal">
      <div className="signature-container" style={{ maxWidth: '95vw', maxHeight: '95vh' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1rem'
        }}>
          <h2 className="signature-title" style={{ margin: 0 }}>
            Anteprima & Firma Documento ({currentDocIndex + 1}/{documents.length})
          </h2>
          <button 
            className="btn-clear"
            onClick={onClose}
            style={{ background: '#6b7280', padding: '0.5rem 1rem' }}
          >
            ✕ Chiudi
          </button>
        </div>

        <div style={{ display: 'flex', gap: '2rem', height: 'calc(90vh - 200px)' }}>
          {/* Pannello Anteprima */}
          <div style={{ 
            flex: '2', 
            overflow: 'auto',
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>
              📄 {currentDocument.name}
            </h3>
            
            <DocumentPreview
              imageData={currentDocument.pages && currentDocument.pages[0] ? currentDocument.pages[0] : '/api/placeholder/400/600'}
              signature={signature}
              sealNumber={sealNumber}
              transporterName={
                selectedTransporter ? 
                (transporters.find(t => t.id === selectedTransporter)?.name || 'Trasportatore Sconosciuto') :
                'Firma Personalizzata'
              }
            />
          </div>

          {/* Pannello Controlli */}
          <div style={{ 
            flex: '1', 
            minWidth: '350px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Selezione Trasportatore */}
            <div style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#374151' }}>
                👤 Seleziona Trasportatore
              </h4>
              
              <select
                value={selectedTransporter}
                onChange={(e) => handleTransporterSelect(e.target.value)}
                className="form-input"
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                <option value="">Scegli trasportatore...</option>
                {transporters.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} - {t.company}
                  </option>
                ))}
              </select>

              <button
                className="btn-secondary"
                onClick={handleCustomSignature}
                style={{ 
                  width: '100%', 
                  background: '#6366f1', 
                  color: 'white',
                  padding: '0.75rem'
                }}
              >
                ✍️ Crea Firma Personalizzata
              </button>
            </div>

            {/* Numero Sigillo */}
            <div style={{ 
              background: 'white', 
              padding: '1.5rem', 
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#374151' }}>
                🏷️ Numero Sigillo (Opzionale)
              </h4>
              
              <input
                type="text"
                value={sealNumber}
                onChange={(e) => setSealNumber(e.target.value)}
                className="form-input"
                placeholder="es. AL2025001"
                style={{ width: '100%' }}
              />
            </div>

            {/* Informazioni Documento */}
            <div style={{ 
              background: '#f0f9ff', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid #bae6fd'
            }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>
                📊 Info Documento
              </h5>
              <div style={{ fontSize: '0.9rem', color: '#1e40af' }}>
                <div>Pagine: {currentDocument.pages.length}</div>
                <div>Stato: {currentDocument.signed ? '✅ Firmato' : '⏳ Da firmare'}</div>
              </div>
            </div>

            {/* Azioni */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn-save"
                onClick={processCurrentDocument}
                disabled={!signature}
                style={{ 
                  width: '100%', 
                  padding: '1rem',
                  opacity: !signature ? 0.5 : 1
                }}
              >
                ✓ Applica Firma e Struttura A4
              </button>
              
              <button
                className="btn-clear"
                onClick={skipCurrentDocument}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                ⏭️ Salta Documento
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ 
          marginTop: '1rem',
          background: '#e5e7eb',
          borderRadius: '8px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: '#10b981',
            height: '100%',
            width: `${((currentDocIndex + processedDocuments.length) / documents.length) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          marginTop: '0.5rem',
          fontSize: '0.9rem',
          color: '#64748b'
        }}>
          Processati: {processedDocuments.length} / {documents.length}
        </div>
      </div>
    </div>
  );
};

export default DocumentSignatureManager;