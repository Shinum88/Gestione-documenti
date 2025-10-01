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
  onCancel 
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

  // Processa automaticamente l'immagine quando OpenCV è pronto
  useEffect(() => {
    if (opencv && imageData && !isProcessing && !isOpenCVLoading) {
      processImageAutomatically();
    }
  }, [opencv, imageData, isOpenCVLoading]);

  /**
   * Rilevamento automatico dei bordi del documento
   */
  const processImageAutomatically = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🔄 Iniziando rilevamento automatico bordi...');
      
      const img = new Image();
      img.onload = () => {
        try {
          // Prepara canvas originale
          const originalCanvas = originalCanvasRef.current;
          originalCanvas.width = img.width;
          originalCanvas.height = img.height;
          const originalCtx = originalCanvas.getContext('2d');
          originalCtx.drawImage(img, 0, 0);

          // Converti in Mat OpenCV
          const src = opencv.imread(originalCanvas);
          
          // Rileva i bordi del documento
          const detectedCorners = detectDocumentCorners(src);
          
          if (detectedCorners && detectedCorners.length === 4) {
            console.log('✅ Bordi rilevati automaticamente:', detectedCorners);
            setCorners(detectedCorners);
            
            // Applica correzione prospettica automatica
            const correctedImage = applyPerspectiveCorrection(src, detectedCorners);
            setProcessedImage(correctedImage);
            
            toast.success('Documento rilevato automaticamente!');
          } else {
            console.warn('⚠️ Rilevamento automatico fallito');
            toast.warning('Rilevamento automatico fallito. Usa modalità manuale.');
            setManualMode(true);
          }
          
          // Cleanup
          src.delete();
          
        } catch (error) {
          console.error('❌ Errore elaborazione:', error);
          toast.error('Errore durante l\'elaborazione');
          setManualMode(true);
        } finally {
          setIsProcessing(false);
        }
      };
      
      img.src = imageData;
      
    } catch (error) {
      console.error('❌ Errore rilevamento automatico:', error);
      toast.error('Errore durante il rilevamento automatico');
      setIsProcessing(false);
      setManualMode(true);
    }
  };

  /**
   * Rileva i bordi del documento usando OpenCV
   * MIGLIORATO: rileva il contorno ESTERNO del foglio, non tabelle interne
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
            // Verifica che il contorno sia vicino ai bordi dell'immagine
            // (contorno esterno, non interno)
            const points = [];
            for (let j = 0; j < 4; j++) {
              const point = approx.data32S.slice(j * 2, j * 2 + 2);
              points.push({ x: point[0], y: point[1] });
            }
            
            // Calcola quanto è vicino ai bordi
            const margin = 20; // pixels
            const nearBorders = points.some(p => 
              p.x < margin || p.x > src.cols - margin ||
              p.y < margin || p.y > src.rows - margin
            );
            
            if (nearBorders) {
              console.log(`✅ Contorno candidato: area=${area}, punti=4, vicino ai bordi`);
              largestArea = area;
              if (bestContour) bestContour.delete();
              if (bestApprox) bestApprox.delete();
              bestContour = contour.clone();
              bestApprox = approx.clone();
            } else {
              console.log(`⚠️ Contorno scartato: area=${area}, ma troppo interno`);
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
   * Ordina i punti in senso orario partendo da top-left
   */
  const orderPoints = (points) => {
    // Calcola il centro
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / 4;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / 4;

    // Ordina in base all'angolo rispetto al centro
    points.sort((a, b) => {
      const angleA = Math.atan2(a.y - centerY, a.x - centerX);
      const angleB = Math.atan2(b.y - centerY, b.x - centerX);
      return angleA - angleB;
    });

    return points;
  };

  /**
   * Applica correzione prospettica e filtri da scanner
   */
  const applyPerspectiveCorrection = (src, corners) => {
    try {
      // Calcola dimensioni del documento corretto
      const width = Math.max(
        distance(corners[0], corners[1]),
        distance(corners[2], corners[3])
      );
      const height = Math.max(
        distance(corners[0], corners[3]),
        distance(corners[1], corners[2])
      );

      // Punti sorgente (angoli rilevati)
      const srcPoints = opencv.matFromArray(4, 1, opencv.CV_32FC2, [
        corners[0].x, corners[0].y,
        corners[1].x, corners[1].y,
        corners[2].x, corners[2].y,
        corners[3].x, corners[3].y
      ]);

      // Punti destinazione (rettangolo perfetto)
      const dstPoints = opencv.matFromArray(4, 1, opencv.CV_32FC2, [
        0, 0,
        width, 0,
        width, height,
        0, height
      ]);

      // Calcola matrice di trasformazione prospettica
      const transformMatrix = opencv.getPerspectiveTransform(srcPoints, dstPoints);

      // Applica trasformazione
      const corrected = new opencv.Mat();
      opencv.warpPerspective(src, corrected, transformMatrix, new opencv.Size(width, height));

      // Applica filtri da scanner
      const processed = applyDocumentFilters(corrected);

      // Mostra il risultato nel canvas
      displayProcessedImage(processed);

      // Cleanup
      srcPoints.delete();
      dstPoints.delete();
      transformMatrix.delete();
      corrected.delete();

      return processed;

    } catch (error) {
      console.error('Errore correzione prospettica:', error);
      return null;
    }
  };

  /**
   * Applica filtri tipici da scanner
   */
  const applyDocumentFilters = (src) => {
    try {
      // 1. Converti in scala di grigi
      const gray = new opencv.Mat();
      opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);

      // 2. Applica filtro bilaterale per mantenere i bordi nitidi
      const bilateral = new opencv.Mat();
      opencv.bilateralFilter(gray, bilateral, 9, 75, 75);

      // 3. Soglia adattiva per ottenere bianco/nero pulito
      const adaptive = new opencv.Mat();
      opencv.adaptiveThreshold(
        bilateral,
        adaptive,
        255,
        opencv.ADAPTIVE_THRESH_GAUSSIAN_C,
        opencv.THRESH_BINARY,
        11,
        2
      );

      // 4. Operazioni morfologiche per pulire il risultato
      const kernel = opencv.getStructuringElement(opencv.MORPH_RECT, new opencv.Size(2, 2));
      const morphed = new opencv.Mat();
      opencv.morphologyEx(adaptive, morphed, opencv.MORPH_CLOSE, kernel);

      // Cleanup
      gray.delete();
      bilateral.delete();
      adaptive.delete();
      kernel.delete();

      return morphed;

    } catch (error) {
      console.error('Errore filtri documento:', error);
      return src; // Restituisci originale se i filtri falliscono
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
              {!manualMode && !processedImage && (
                <button 
                  className="btn-secondary" 
                  onClick={() => setManualMode(true)}
                >
                  🖱️ Selezione Manuale
                </button>
              )}

              {manualMode && (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={processManualSelection}
                    disabled={selectedCorners.length !== 4}
                  >
                    ⚙️ Elabora Selezione
                  </button>
                  <button className="btn-clear" onClick={resetSelection}>
                    🔄 Reset
                  </button>
                </>
              )}

              {processedImage && (
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