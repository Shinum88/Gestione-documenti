import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useOpenCV } from '../contexts/OpenCVContext';

/**
 * DocumentScanner - Componente per rilevamento automatico bordi e correzione prospettica
 * Utilizza OpenCV.js per elaborazione immagini professionale
 */
const DocumentScanner = ({ 
  imageData, 
  onProcessed, 
  onCancel,
  onNextPage = null, // Callback opzionale per "Pagina Successiva"
  onFinish = null, // Callback opzionale per "Concludi e Invia" (mostra anteprima)
  showMultiPageOptions = false // Mostra opzioni multipagina
}) => {
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  
  // Usa OpenCV dal context globale
  const { opencv, isLoading: isOpenCVLoading, error: openCVError } = useOpenCV();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [corners, setCorners] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [selectedCorners, setSelectedCorners] = useState([]);
  const [processedImage, setProcessedImage] = useState(null);

  // Inizializza l'immagine originale quando OpenCV è pronto (SENZA elaborazione automatica)
  useEffect(() => {
    if (opencv && imageData && !isOpenCVLoading) {
      const img = new Image();
      img.onload = () => {
        try {
          // Prepara canvas originale
          const originalCanvas = originalCanvasRef.current;
          originalCanvas.width = img.width;
          originalCanvas.height = img.height;
          const originalCtx = originalCanvas.getContext('2d');
          originalCtx.drawImage(img, 0, 0);

          console.log('📷 Immagine caricata. Seleziona manualmente i 4 angoli del documento.');
          toast.info('Clicca sui 4 angoli del documento nell\'ordine: Alto-Sinistra, Alto-Destra, Basso-Destra, Basso-Sinistra');
          
          // Attiva direttamente la modalità manuale
          setManualMode(true);
        } catch (error) {
          console.error('❌ Errore caricamento immagine:', error);
          toast.error('Errore durante il caricamento');
        }
      };
      
      img.src = imageData;
    }
  }, [opencv, imageData, isOpenCVLoading]);

  /**
   * Rileva i bordi del documento usando OpenCV - FUNZIONE RIMOSSA
   * Elaborazione manuale sempre attiva per richiesta utente
   */
  const detectDocumentCorners = (src) => {
    try {
      const imageArea = src.rows * src.cols;
      
      // 1. Converti in scala di grigi
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);

      // 2. Aumenta contrasto per migliorare rilevamento bordi
      const enhanced = new opencv.Mat();
      opencv.equalizeHist(gray, enhanced);

      // 3. Applica filtro Gaussiano per ridurre il rumore
      const blurred = new opencv.Mat();
      opencv.GaussianBlur(enhanced, blurred, new opencv.Size(7, 7), 0);

      // 4. Rilevamento bordi con Canny (soglie più basse per catturare bordi deboli)
      const edges = new opencv.Mat();
      opencv.Canny(blurred, edges, 30, 100);

      // 5. Dilatazione per collegare bordi spezzati
      const kernel = opencv.getStructuringElement(opencv.MORPH_RECT, new opencv.Size(5, 5));
      const dilated = new opencv.Mat();
      opencv.dilate(edges, dilated, kernel);

      // 6. Trova contorni ESTERNI solamente
      const contours = new opencv.MatVector();
      const hierarchy = new opencv.Mat();
      opencv.findContours(dilated, contours, hierarchy, opencv.RETR_EXTERNAL, opencv.CHAIN_APPROX_SIMPLE);

      // 7. Trova il contorno più grande che approssima un rettangolo
      let largestArea = 0;
      let bestContour = null;
      let bestApprox = null;

      console.log(`🔍 Trovati ${contours.size()} contorni esterni`);

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = opencv.contourArea(contour);
        
        // Il contorno deve essere ALMENO il 50% dell'immagine (non 10%)
        // Questo assicura che prendiamo il foglio intero, non elementi interni
        if (area > largestArea && area > imageArea * 0.5) {
          // Approssima il contorno con tolleranza variabile
          const perimeter = opencv.arcLength(contour, true);
          const epsilon = 0.02 * perimeter;
          const approx = new opencv.Mat();
          opencv.approxPolyDP(contour, approx, epsilon, true);
          
          // Deve avere 4 punti (quadrilatero)
          if (approx.rows === 4) {
            // Estrai i 4 punti
            const points = [];
            for (let j = 0; j < 4; j++) {
              const point = approx.data32S.slice(j * 2, j * 2 + 2);
              points.push({ x: point[0], y: point[1] });
            }
            
            // Verifica che il contorno copra una grande porzione dell'immagine
            // Se copre >50% dell'area, è molto probabilmente il foglio
            const areaCoverage = area / imageArea;
            
            if (areaCoverage > 0.5) {
              console.log(`✅ Contorno candidato: area=${area} (${(areaCoverage * 100).toFixed(1)}%), punti=4`);
              largestArea = area;
              if (bestContour) bestContour.delete();
              if (bestApprox) bestApprox.delete();
              bestContour = contour.clone();
              bestApprox = approx.clone();
            } else {
              console.log(`⚠️ Contorno scartato: area=${area} (${(areaCoverage * 100).toFixed(1)}%), troppo piccolo`);
            }
          }
          
          approx.delete();
        }
      }

      // Cleanup
      gray.delete();
      enhanced.delete();
      blurred.delete();
      edges.delete();
      kernel.delete();
      dilated.delete();
      contours.delete();
      hierarchy.delete();

      if (bestApprox) {
        // Estrai i 4 punti
        const points = [];
        for (let i = 0; i < 4; i++) {
          const point = bestApprox.data32S.slice(i * 2, i * 2 + 2);
          points.push({ x: point[0], y: point[1] });
        }
        
        if (bestContour) bestContour.delete();
        bestApprox.delete();
        
        console.log('✅ Bordi esterni del foglio rilevati:', points);
        
        // Ordina i punti (top-left, top-right, bottom-right, bottom-left)
        return orderPoints(points);
      }

      console.warn('⚠️ Nessun contorno esterno valido trovato');
      return null;
      
    } catch (error) {
      console.error('❌ Errore rilevamento bordi:', error);
      return null;
    }
  };

  /**
   * Ordina i punti nell'ordine: Top-Left, Top-Right, Bottom-Right, Bottom-Left
   * Metodo robusto basato su somma e differenza coordinate
   */
  const orderPoints = (points) => {
    // Ordina per somma (x + y): il punto con somma minore è Top-Left
    const sortedBySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const topLeft = sortedBySum[0];
    const bottomRight = sortedBySum[3];
    
    // Ordina per differenza (y - x): 
    // Top-Right avrà differenza negativa (y piccolo, x grande)
    // Bottom-Left avrà differenza positiva (y grande, x piccolo)
    const sortedByDiff = [...points].sort((a, b) => (a.y - a.x) - (b.y - b.x));
    const topRight = sortedByDiff[0];
    const bottomLeft = sortedByDiff[3];
    
    const orderedPoints = [topLeft, topRight, bottomRight, bottomLeft];
    
    console.log('📍 Punti ordinati:', {
      'Top-Left': topLeft,
      'Top-Right': topRight,
      'Bottom-Right': bottomRight,
      'Bottom-Left': bottomLeft
    });
    
    return orderedPoints;
  };

  /**
   * Applica correzione prospettica e filtri da scanner
   */
  const applyPerspectiveCorrection = (src, corners) => {
    try {
      console.log('📐 Applicando correzione prospettica con angoli:', corners);
      
      // Calcola dimensioni del documento corretto usando le distanze tra i punti
      const width = Math.round(Math.max(
        distance(corners[0], corners[1]),
        distance(corners[3], corners[2])
      ));
      const height = Math.round(Math.max(
        distance(corners[0], corners[3]),
        distance(corners[1], corners[2])
      ));
      
      console.log(`📏 Dimensioni documento: ${width}x${height}px`);

      // Punti sorgente (angoli rilevati nell'ordine corretto: TL, TR, BR, BL)
      const srcPoints = opencv.matFromArray(4, 1, opencv.CV_32FC2, [
        corners[0].x, corners[0].y,  // Top-Left
        corners[1].x, corners[1].y,  // Top-Right
        corners[2].x, corners[2].y,  // Bottom-Right
        corners[3].x, corners[3].y   // Bottom-Left
      ]);

      // Punti destinazione (rettangolo perfetto frontale)
      const dstPoints = opencv.matFromArray(4, 1, opencv.CV_32FC2, [
        0, 0,                // Top-Left
        width, 0,            // Top-Right
        width, height,       // Bottom-Right
        0, height            // Bottom-Left
      ]);

      // Calcola matrice di trasformazione prospettica
      const transformMatrix = opencv.getPerspectiveTransform(srcPoints, dstPoints);
      console.log('✅ Matrice trasformazione calcolata');

      // Applica trasformazione prospettica (warpPerspective)
      const corrected = new opencv.Mat();
      opencv.warpPerspective(
        src, 
        corrected, 
        transformMatrix, 
        new opencv.Size(width, height),
        opencv.INTER_LINEAR,
        opencv.BORDER_CONSTANT,
        new opencv.Scalar(255, 255, 255, 255)
      );
      
      console.log('✅ Trasformazione prospettica applicata - documento "appiattito"');

      // Applica filtri da scanner all'immagine corretta
      const processed = applyDocumentFilters(corrected);

      // Mostra il risultato nel canvas
      displayProcessedImage(processed);

      // Cleanup
      srcPoints.delete();
      dstPoints.delete();
      transformMatrix.delete();
      corrected.delete();

      console.log('✅ Correzione prospettica completata');
      return processed;

    } catch (error) {
      console.error('❌ Errore correzione prospettica:', error);
      return null;
    }
  };

  /**
   * Applica filtri tipici da scanner
   * MIGLIORATO: preserva leggibilità testo stampato, evita segmentazione
   */
  const applyDocumentFilters = (src) => {
    try {
      // 1. Converti in scala di grigi
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);

      // 2. Aumenta leggermente il contrasto senza esagerare
      const enhanced = new opencv.Mat();
      const alpha = 1.3; // Contrasto moderato (non 2.0)
      const beta = 10;   // Luminosità leggermente aumentata
      opencv.convertScaleAbs(gray, enhanced, alpha, beta);

      // 3. Riduci rumore delicatamente con filtro Gaussiano
      const denoised = new opencv.Mat();
      opencv.GaussianBlur(enhanced, denoised, new opencv.Size(3, 3), 0);

      // 4. Sharpening delicato per migliorare nitidezza
      const kernel = opencv.matFromArray(3, 3, opencv.CV_32F, [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ]);
      const sharpened = new opencv.Mat();
      opencv.filter2D(denoised, sharpened, -1, kernel);

      // 5. Soglia adattiva DELICATA (parametri meno aggressivi)
      const adaptive = new opencv.Mat();
      opencv.adaptiveThreshold(
        sharpened,
        adaptive,
        255,
        opencv.ADAPTIVE_THRESH_GAUSSIAN_C,
        opencv.THRESH_BINARY,
        21,  // blockSize più grande (era 11) -> aree più ampie
        4    // C più basso (era 2) -> meno aggressivo
      );

      // 6. Operazione morfologica MINIMALE per collegare testo spezzato
      const morphKernel = opencv.getStructuringElement(opencv.MORPH_RECT, new opencv.Size(1, 1));
      const morphed = new opencv.Mat();
      opencv.morphologyEx(adaptive, morphed, opencv.MORPH_CLOSE, morphKernel);

      // Cleanup
      gray.delete();
      enhanced.delete();
      denoised.delete();
      kernel.delete();
      sharpened.delete();
      adaptive.delete();
      morphKernel.delete();

      console.log('✅ Filtri scanner applicati con leggibilità migliorata');
      return morphed;

    } catch (error) {
      console.error('❌ Errore filtri documento:', error);
      // Fallback: restituisci solo scala di grigi con sharpening
      try {
        const gray = new opencv.Mat();
        opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);
        const kernel = opencv.matFromArray(3, 3, opencv.CV_32F, [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0
        ]);
        const sharpened = new opencv.Mat();
        opencv.filter2D(gray, sharpened, -1, kernel);
        gray.delete();
        kernel.delete();
        return sharpened;
      } catch {
        return src; // Ultima risorsa: restituisci originale
      }
    }
  };

  /**
   * Mostra l'immagine elaborata nel canvas
   */
  const displayProcessedImage = (processedMat) => {
    try {
      const canvas = canvasRef.current;
      if (canvas && processedMat) {
        opencv.imshow(canvas, processedMat);
        console.log('✅ Immagine elaborata visualizzata nel canvas');
      }
    } catch (error) {
      console.error('Errore visualizzazione:', error);
    }
  };

  /**
   * Calcola distanza tra due punti
   */
  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  /**
   * Gestisce selezione manuale dei punti
   */
  const handleCanvasClick = (event) => {
    if (!manualMode || selectedCorners.length >= 4) return;

    const canvas = originalCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Scala le coordinate per le dimensioni reali del canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const newPoint = {
      x: Math.round(x * scaleX),
      y: Math.round(y * scaleY)
    };

    const newCorners = [...selectedCorners, newPoint];
    setSelectedCorners(newCorners);

    // Disegna i punti selezionati
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();

    if (newCorners.length === 4) {
      toast.success('4 angoli selezionati! Clicca Elabora per continuare.');
    }
  };

  /**
   * Elabora con punti selezionati manualmente
   */
  const processManualSelection = () => {
    if (selectedCorners.length !== 4) {
      toast.error('Seleziona esattamente 4 angoli');
      return;
    }

    setIsProcessing(true);

    try {
      const canvas = originalCanvasRef.current;
      const src = opencv.imread(canvas);
      
      const orderedCorners = orderPoints(selectedCorners);
      const processed = applyPerspectiveCorrection(src, orderedCorners);
      
      setCorners(orderedCorners);
      setProcessedImage(processed);
      setManualMode(false);
      
      src.delete();
      toast.success('Documento elaborato con successo!');
      
    } catch (error) {
      console.error('Errore elaborazione manuale:', error);
      toast.error('Errore durante l\'elaborazione manuale');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Conferma il risultato ed invia al componente padre
   */
  const confirmResult = () => {
    if (!processedImage) {
      toast.error('Nessuna immagine elaborata disponibile');
      return;
    }

    try {
      const canvas = canvasRef.current;
      const processedImageData = canvas.toDataURL('image/jpeg', 0.9);
      onProcessed(processedImageData);
      
    } catch (error) {
      console.error('Errore conferma risultato:', error);
      toast.error('Errore durante la conferma');
    }
  };

  /**
   * Reset per riprova
   */
  const resetSelection = () => {
    setSelectedCorners([]);
    setManualMode(true);
    setCorners(null);
    setProcessedImage(null);
    
    // Ridisegna immagine originale
    const img = new Image();
    img.onload = () => {
      const canvas = originalCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageData;
  };

  // Mostra loader se OpenCV non è ancora pronto
  if (isOpenCVLoading) {
    return (
      <div className="signature-modal">
        <div className="signature-container" style={{ textAlign: 'center' }}>
          <h2 className="signature-title">🔄 Caricamento OpenCV</h2>
          <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
          <p>Caricamento libreria di elaborazione immagini...</p>
        </div>
      </div>
    );
  }

  // Mostra errore se il caricamento è fallito
  if (openCVError) {
    return (
      <div className="signature-modal">
        <div className="signature-container" style={{ textAlign: 'center' }}>
          <h2 className="signature-title">❌ Errore Caricamento</h2>
          <p style={{ color: '#ef4444', marginTop: '1rem' }}>{openCVError}</p>
          <button className="btn-secondary" onClick={onCancel} style={{ marginTop: '1rem' }}>
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signature-modal">
      <div className="signature-container" style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="signature-title">📄 Scanner Automatico Documento</h2>
          <button className="btn-clear" onClick={onCancel}>✕ Chiudi</button>
        </div>

        <div style={{ display: 'flex', gap: '2rem', height: 'calc(80vh - 150px)' }}>
          {/* Canvas originale */}
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Immagine Originale</h3>
            <canvas
              ref={originalCanvasRef}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                border: '1px solid #e2e8f0',
                cursor: manualMode ? 'crosshair' : 'default'
              }}
              onClick={handleCanvasClick}
            />
            {manualMode && (
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
                Clicca sui 4 angoli del documento ({selectedCorners.length}/4)
              </p>
            )}
          </div>

          {/* Canvas elaborato */}
          <div style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Documento Elaborato</h3>
            <canvas
              ref={canvasRef}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%',
                border: '1px solid #e2e8f0',
                background: processedImage ? 'white' : '#f8fafc'
              }}
            />
            {!processedImage && (
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af', 
                padding: '2rem',
                fontSize: '0.9rem'
              }}>
                Il documento elaborato apparirà qui
              </div>
            )}
          </div>
        </div>

        {/* Controlli */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center', 
          marginTop: '1rem',
          padding: '1rem',
          background: '#f8fafc',
          borderRadius: '8px'
        }}>
          {isProcessing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="loading-spinner"></div>
              <span>Elaborazione in corso...</span>
            </div>
          ) : (
            <>
              {!processedImage && (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={processManualSelection}
                    disabled={selectedCorners.length !== 4}
                  >
                    ⚙️ Elabora ({selectedCorners.length}/4 angoli)
                  </button>
                  <button className="btn-clear" onClick={resetSelection}>
                    🔄 Reset Selezione
                  </button>
                </>
              )}

              {processedImage && (
                <>
                  {showMultiPageOptions ? (
                    <>
                      <button 
                        className="btn-save" 
                        onClick={() => {
                          confirmResult();
                          if (onNextPage) onNextPage();
                        }}
                      >
                        ➕ Pagina Successiva
                      </button>
                      <button className="btn-save" onClick={confirmResult}>
                        ✅ Concludi e Invia
                      </button>
                      <button className="btn-secondary" onClick={resetSelection}>
                        🔄 Modifica Manualmente
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-save" onClick={confirmResult}>
                        ✅ Conferma e Invia
                      </button>
                      <button className="btn-secondary" onClick={resetSelection}>
                        🔄 Modifica Manualmente
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Info operazioni */}
        {processedImage && (
          <div style={{ 
            background: '#d1fae5', 
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            fontSize: '0.9rem'
          }}>
            <h4 style={{ color: '#065f46', marginBottom: '0.5rem' }}>✅ Elaborazioni Applicate:</h4>
            <ul style={{ color: '#065f46', marginLeft: '1rem' }}>
              <li>📐 Correzione prospettica automatica</li>
              <li>🔍 Conversione in scala di grigi</li>
              <li>⚡ Aumento contrasto e nitidezza</li>
              <li>⚫ Soglia adattiva bianco/nero</li>
              <li>🧹 Filtro morfologico di pulizia</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentScanner;