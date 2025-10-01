import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import DocumentScanner from './DocumentScanner';
import { toast } from 'sonner';

const CameraScanner = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const { 
    currentFolder, 
    currentDocument, 
    setCurrentDocument, 
    documents, 
    setDocuments 
  } = useAppContext();

  const [isScanning, setIsScanning] = useState(true);
  const [currentPhoto, setCurrentPhoto] = useState(null); // Foto corrente da elaborare
  const [processedPages, setProcessedPages] = useState([]); // Pagine già elaborate
  const [showDocumentScanner, setShowDocumentScanner] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // Anteprima finale
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    if (!currentFolder) {
      navigate('/operator');
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [currentFolder, navigate]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Fotocamera posteriore per iOS e Android
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraError(false);
      }
    } catch (error) {
      console.error('Errore accesso fotocamera:', error);
      setCameraError(true);
      toast.error('Impossibile accedere alla fotocamera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Mostra immediatamente DocumentScanner per elaborare la foto
    setCurrentPhoto(imageData);
    setShowDocumentScanner(true);
    setIsScanning(false);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Mostra immediatamente DocumentScanner per elaborare la foto
        setCurrentPhoto(e.target.result);
        setShowDocumentScanner(true);
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Chiamato quando l'utente conferma la pagina elaborata dal DocumentScanner
   */
  const handlePageProcessed = (processedImageData) => {
    // Aggiungi la pagina elaborata all'array
    setProcessedPages(prev => [...prev, processedImageData]);
    setShowDocumentScanner(false);
    setCurrentPhoto(null);
    
    toast.success(`Pagina ${processedPages.length + 1} elaborata con successo`);
  };

  /**
   * Chiamato quando l'utente cancella dal DocumentScanner
   */
  const handleDocumentScannerCancel = () => {
    setShowDocumentScanner(false);
    setCurrentPhoto(null);
    // Torna alla fotocamera per riscattare
    setIsScanning(true);
  };

  /**
   * Aggiunge un'altra pagina al documento
   */
  const addNextPage = () => {
    setIsScanning(true);
    toast.info('Scatta la prossima pagina');
  };

  /**
   * Conclude la scansione e mostra anteprima di tutte le pagine
   * Accetta opzionalmente l'ultima pagina da aggiungere prima di mostrare l'anteprima
   */
  const concludeAndShowPreview = (finalPageImage = null) => {
    console.log('🏁 concludeAndShowPreview chiamato', {
      currentPagesCount: processedPages.length,
      hasFinalPage: !!finalPageImage
    });
    
    // Se viene passata l'ultima pagina, aggiungila prima di mostrare l'anteprima
    if (finalPageImage) {
      setProcessedPages(prev => {
        const updated = [...prev, finalPageImage];
        console.log(`✅ Aggiunta ultima pagina. Totale: ${updated.length}`);
        return updated;
      });
    }
    
    // Chiudi il DocumentScanner se è aperto
    setShowDocumentScanner(false);
    setCurrentPhoto(null);
    
    // Mostra l'anteprima
    setShowPreview(true);
    
    const totalPages = processedPages.length + (finalPageImage ? 1 : 0);
    console.log(`📄 Mostrando anteprima con ${totalPages} pagine`);
  };

  /**
   * Conferma finale e salva il documento
   */
  const confirmAndSave = () => {
    try {
      const finalDocument = {
        _id: Date.now().toString(),
        folderId: currentFolder._id,
        name: `Documento_${Date.now()}`,
        pages: processedPages,
        signed: false,
        signature: null,
        sealNumber: null,
        transporterName: null,
        processedByOperator: true,
        createdAt: new Date().toISOString()
      };
      
      // Mock POST /api/documents
      setDocuments(prev => [...prev, finalDocument]);
      
      console.log('✅ Documento salvato:', finalDocument);
      toast.success(`Documento con ${processedPages.length} pagine salvato!`);
      
      // IMPORTANTE: Ferma la camera prima di navigare
      stopCamera();
      
      // Reset completo di tutti gli stati
      setProcessedPages([]);
      setShowPreview(false);
      setCurrentPhoto(null);
      setShowDocumentScanner(false);
      setIsScanning(false);
      
      // Naviga alla dashboard operatore
      console.log('🔄 Navigazione a /operator');
      navigate('/operator');
      
    } catch (error) {
      console.error('❌ Errore salvataggio documento:', error);
      toast.error('Errore durante il salvataggio del documento');
    }
  };

  /**
   * Annulla l'anteprima e torna alla scansione
   */
  const cancelPreview = () => {
    setShowPreview(false);
    setIsScanning(true);
  };

  const goBack = () => {
    // Se ci sono pagine elaborate, chiedi conferma
    if (processedPages.length > 0) {
      if (window.confirm(`Hai ${processedPages.length} pagine elaborate. Vuoi scartarle?`)) {
        stopCamera();
        setProcessedPages([]);
        setShowPreview(false);
        setCurrentPhoto(null);
        setShowDocumentScanner(false);
        navigate('/operator');
      }
    } else {
      stopCamera();
      navigate('/operator');
    }
  };

  if (!currentFolder) {
    return <div>Caricamento...</div>;
  }

  // Mostra anteprima finale di tutte le pagine elaborate
  if (showPreview) {
    return (
      <div className="scanner-container">
        <div className="scanner-header">
          <button className="back-btn" onClick={cancelPreview}>
            ← Indietro
          </button>
          <h1 className="scanner-title">
            Anteprima Documento ({processedPages.length} pagine)
          </h1>
          <div style={{ width: '80px' }}></div>
        </div>

        <div style={{ 
          padding: '2rem', 
          overflowY: 'auto', 
          maxHeight: 'calc(100vh - 200px)',
          background: '#f8f9fa'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {processedPages.map((page, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
                  Pagina {index + 1}
                </h3>
                <img 
                  src={page} 
                  alt={`Pagina ${index + 1}`}
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px'
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="scanner-controls">
          <button className="btn-scanner btn-success" onClick={confirmAndSave}>
            ✅ Conferma e Salva Documento
          </button>
          <button className="btn-scanner btn-secondary" onClick={cancelPreview}>
            🔄 Aggiungi Altre Pagine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scanner-container">
      <div className="scanner-header">
        <button className="back-btn" onClick={goBack}>
          ← Indietro
        </button>
        <h1 className="scanner-title">
          Scanner - {currentFolder.name}
        </h1>
        <div style={{ width: '80px' }}></div>
      </div>

      {isScanning ? (
        <div className="camera-container">
          {cameraError ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
              <p>Fotocamera non disponibile</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button 
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginTop: '1rem' }}
              >
                Seleziona Immagine
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="camera-video"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </>
          )}
        </div>
      ) : null}

      <div className="scanner-controls">
        {isScanning ? (
          <>
            <button className="btn-scanner btn-capture" onClick={capturePhoto}>
              📷 Scansiona
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button 
              className="btn-scanner btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Carica File
            </button>
            
            {processedPages.length > 0 && (
              <button 
                className="btn-scanner btn-success"
                onClick={concludeAndShowPreview}
              >
                ✅ Concludi ({processedPages.length} pagine)
              </button>
            )}
          </>
        ) : null}
        
        <div style={{ width: '100%', textAlign: 'center', color: 'white', fontSize: '0.9rem' }}>
          Pagine elaborate: {processedPages.length}
        </div>
      </div>

      {/* Document Scanner Modal - Appare SUBITO dopo ogni foto */}
      {showDocumentScanner && currentPhoto && (
        <DocumentScanner
          imageData={currentPhoto}
          onProcessed={handlePageProcessed}
          onCancel={handleDocumentScannerCancel}
          onNextPage={addNextPage}
          onFinish={concludeAndShowPreview}
          showMultiPageOptions={true}
        />
      )}
    </div>
  );
};

export default CameraScanner;