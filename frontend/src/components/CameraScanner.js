import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
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
  const [preview, setPreview] = useState(null);
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
    setPreview(imageData);
    setIsScanning(false);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const addPageToDocument = () => {
    if (!preview) return;
    
    const updatedDocument = {
      ...currentDocument,
      pages: [...currentDocument.pages, preview]
    };
    setCurrentDocument(updatedDocument);
    
    // Reset per nuova pagina
    setPreview(null);
    setIsScanning(true);
    
    toast.success(`Pagina ${updatedDocument.pages.length} aggiunta al documento`);
  };

  const concludeScanning = () => {
    if (!preview) return;
    
    // Aggiungi ultima pagina se presente e salva documento senza firma
    const finalDocument = {
      ...currentDocument,
      pages: [...currentDocument.pages, preview]
    };
    
    saveDocumentToDB(finalDocument);
  };

  const saveDocumentToDB = async (documentData) => {
    try {
      // Crea documento senza firma - la firma verrà applicata dal carico merci
      const newDocument = {
        _id: Date.now().toString(),
        folderId: currentFolder._id,
        name: `Documento_${Date.now()}`,
        pages: documentData.pages.filter(Boolean),
        signed: false, // Sempre false - firma applicata dal carico merci
        signature: null,
        sealNumber: null, // Campo per numero sigillo
        transporterName: null, // Campo per nome trasportatore
        createdAt: new Date().toISOString()
      };
      
      // Mock POST /api/documents
      setDocuments(prev => [...prev, newDocument]);
      
      toast.success('Documento salvato con successo');
      
      // Reset e torna alla selezione terzista
      setCurrentDocument({ pages: [] });
      setPreview(null);
      navigate('/operator');
      
    } catch (error) {
      console.error('Errore salvataggio documento:', error);
      toast.error('Errore durante il salvataggio');
    }
  };

  const startNewDocument = async () => {
    // Salva documento corrente con firma se presente
    if (currentDocument.pages.length > 0 || preview) {
      if (signature) {
        await saveDocumentToDB(signature);
      } else {
        setShowSignature(true);
        return;
      }
    }
    
    // Reset per nuovo documento
    setCurrentDocument({ pages: [] });
    setPreview(null);
    setSignature(null);
    setIsScanning(true);
    
    toast.success('Nuovo documento iniziato');
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const goBack = () => {
    navigate('/operator');
  };

  if (!currentFolder) {
    return <div>Caricamento...</div>;
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
      ) : (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
        </div>
      )}

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
          </>
        ) : (
          <>
            <button className="btn-scanner btn-success" onClick={concludeScanning}>
              ✓ Concludi Scansione
            </button>
            <button className="btn-scanner btn-secondary" onClick={addPageToDocument}>
              + Pagina Successiva
            </button>
            <button className="btn-scanner btn-secondary" onClick={startNewDocument}>
              📄 Nuovo Documento
            </button>
            <button 
              className="btn-scanner btn-secondary" 
              onClick={() => {
                setPreview(null);
                setIsScanning(true);
              }}
            >
              🔄 Riscansiona
            </button>
          </>
        )}
        
        <div style={{ width: '100%', textAlign: 'center', color: 'white', fontSize: '0.9rem' }}>
          Pagine documento corrente: {currentDocument.pages.length + (preview ? 1 : 0)}
        </div>
      </div>

      {showSignature && (
        <SignatureCanvas
          onSave={handleSignatureSave}
          onCancel={() => setShowSignature(false)}
        />
      )}
    </div>
  );
};

export default CameraScanner;