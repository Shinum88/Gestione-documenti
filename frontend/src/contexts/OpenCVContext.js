import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

/**
 * OpenCV Context - Gestione globale di OpenCV.js
 * Garantisce che la libreria venga caricata una sola volta per l'intera applicazione
 */
const OpenCVContext = createContext(null);

export const useOpenCV = () => {
  const context = useContext(OpenCVContext);
  if (!context) {
    throw new Error('useOpenCV deve essere usato dentro OpenCVProvider');
  }
  return context;
};

export const OpenCVProvider = ({ children }) => {
  const [opencv, setOpencv] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let loadAttempted = false;

    const loadOpenCV = () => {
      // Previeni multipli tentativi di caricamento
      if (loadAttempted) {
        console.log('⚠️ Tentativo di caricamento OpenCV già in corso');
        return;
      }

      loadAttempted = true;

      // 1. Controlla se OpenCV è già disponibile globalmente
      if (window.cv && window.cv.Mat) {
        console.log('✅ OpenCV.js già disponibile globalmente');
        if (mounted) {
          setOpencv(window.cv);
          setIsLoading(false);
        }
        return;
      }

      // 2. Controlla se lo script è già stato aggiunto
      const existingScript = document.getElementById('opencv-global-script');
      if (existingScript) {
        console.log('⏳ Script OpenCV già presente, attendo inizializzazione...');
        
        // Polling per verificare quando OpenCV è pronto
        const checkInterval = setInterval(() => {
          if (window.cv && window.cv.Mat) {
            console.log('✅ OpenCV.js inizializzato da script esistente');
            if (mounted) {
              setOpencv(window.cv);
              setIsLoading(false);
            }
            clearInterval(checkInterval);
          }
        }, 100);

        // Timeout dopo 30 secondi
        setTimeout(() => {
          clearInterval(checkInterval);
          if (mounted && !window.cv) {
            console.error('❌ Timeout caricamento OpenCV.js');
            setError('Timeout caricamento OpenCV.js');
            setIsLoading(false);
          }
        }, 30000);

        return;
      }

      // 3. Carica OpenCV.js per la prima volta (da file locale)
      console.log('🔄 Caricamento OpenCV.js locale...');
      
      const script = document.createElement('script');
      script.src = '/opencv.js'; // File locale nella cartella public
      script.async = true;
      script.id = 'opencv-global-script';

      script.onload = () => {
        console.log('📦 Script OpenCV caricato, attendo inizializzazione runtime...');

        // Funzione per attendere l'inizializzazione completa
        const waitForOpenCV = () => {
          if (window.cv && window.cv.Mat) {
            console.log('✅ OpenCV.js completamente inizializzato e pronto');
            if (mounted) {
              setOpencv(window.cv);
              setIsLoading(false);
            }
          } else {
            setTimeout(waitForOpenCV, 100);
          }
        };

        // OpenCV può avere un callback onRuntimeInitialized
        if (window.cv) {
          if (window.cv.Mat) {
            // Già pronto
            if (mounted) {
              setOpencv(window.cv);
              setIsLoading(false);
            }
          } else {
            // Imposta callback per quando il runtime sarà pronto
            window.cv.onRuntimeInitialized = () => {
              console.log('✅ OpenCV runtime completamente inizializzato');
              if (mounted) {
                setOpencv(window.cv);
                setIsLoading(false);
              }
            };
          }
        } else {
          waitForOpenCV();
        }
      };

      script.onerror = (error) => {
        console.error('❌ Errore caricamento OpenCV.js:', error);
        if (mounted) {
          setError('Impossibile caricare OpenCV.js dalla CDN');
          setIsLoading(false);
          toast.error('Errore caricamento libreria di elaborazione immagini');
        }
      };

      document.head.appendChild(script);
    };

    loadOpenCV();

    // Cleanup
    return () => {
      mounted = false;
      // NON rimuovere lo script - lo manteniamo globale per tutta la sessione
    };
  }, []);

  const value = {
    opencv,
    isLoading,
    error,
    isReady: opencv !== null && !isLoading
  };

  return (
    <OpenCVContext.Provider value={value}>
      {children}
    </OpenCVContext.Provider>
  );
};

export default OpenCVContext;
