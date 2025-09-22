import React, { useRef, useEffect, useState } from 'react';

const DocumentPreview = ({ 
  imageData, 
  signature = null, 
  sealNumber = null, 
  transporterName = null,
  onPositionsCalculated = null
}) => {
  const canvasRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);
  const [positions, setPositions] = useState(null);

  // Conversione mm a pixel basata su DPI
  const mmToPx = (mm, dpi = 300) => {
    return (mm * dpi) / 25.4; // 25.4mm = 1 inch
  };

  // Calcolo proporzioni A4 e posizioni basate sull'immagine di riferimento
  const calculateA4Positions = (imgWidth, imgHeight) => {
    const A4_RATIO = 1.414; // A4 ratio (297/210)
    const currentRatio = imgHeight / imgWidth;
    
    // Determina se l'immagine è orientata correttamente come A4
    const isA4Portrait = Math.abs(currentRatio - A4_RATIO) < 0.2; // Tolleranza aumentata
    
    if (!isA4Portrait) {
      console.warn('L\'immagine non sembra essere in formato A4 portrait, ma procedo comunque');
    }

    // Calcola DPI approssimativo basandosi sulle dimensioni A4 standard
    const assumedDPI = imgWidth / (210 / 25.4); // Assume larghezza A4 = 210mm
    
    // Margini in pixel - basati sull'analisi dell'immagine di riferimento
    // Dall'immagine: margini circa 15-20mm su tutti i lati
    const margins = {
      top: mmToPx(18, assumedDPI),
      bottom: mmToPx(20, assumedDPI), 
      left: mmToPx(15, assumedDPI),
      right: mmToPx(15, assumedDPI)
    };

    // Area sicura del contenuto
    const contentArea = {
      x: margins.left,
      y: margins.top,
      width: imgWidth - margins.left - margins.right,
      height: imgHeight - margins.top - margins.bottom
    };

    // Posizione firma (basso a destra) - area gialla dall'immagine
    // Dall'analisi: circa 60-70mm x 25-30mm, 8-12mm dai bordi
    const signatureArea = {
      width: mmToPx(65, assumedDPI),
      height: mmToPx(28, assumedDPI),
      x: imgWidth - mmToPx(12, assumedDPI) - mmToPx(65, assumedDPI),
      y: imgHeight - mmToPx(15, assumedDPI) - mmToPx(28, assumedDPI)
    };

    // Posizione testo sigillo/trasportatore (basso a sinistra) - area rossa dall'immagine
    // Dall'analisi: circa 12-15mm dai bordi, spazio per 2 righe di testo
    const textArea = {
      x: mmToPx(15, assumedDPI),
      y: imgHeight - mmToPx(15, assumedDPI),
      fontSize: Math.max(10, mmToPx(3.2, assumedDPI)), // ~9-10pt
      width: mmToPx(80, assumedDPI), // Larghezza area testo
      height: mmToPx(25, assumedDPI)  // Altezza area testo
    };

    return {
      margins,
      contentArea,
      signatureArea,
      textArea,
      dpi: assumedDPI,
      isA4Portrait
    };
  };

  // Disegna l'anteprima con guide visive
  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Imposta dimensioni canvas
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Calcola posizioni A4
      const calculatedPositions = calculateA4Positions(img.width, img.height);
      setPositions(calculatedPositions);
      setDimensions({ width: img.width, height: img.height });
      
      // Notifica le posizioni calcolate
      if (onPositionsCalculated) {
        onPositionsCalculated(calculatedPositions);
      }

      // Disegna l'immagine originale
      ctx.drawImage(img, 0, 0);

      // === GUIDE VISIVE (solo anteprima) ===
      
      // 1. Margini blu
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        calculatedPositions.margins.left,
        calculatedPositions.margins.top,
        calculatedPositions.contentArea.width,
        calculatedPositions.contentArea.height
      );

      // 2. Riquadro giallo per firma
      ctx.fillStyle = 'rgba(251, 191, 36, 0.3)'; // Giallo trasparente
      ctx.fillRect(
        calculatedPositions.signatureArea.x,
        calculatedPositions.signatureArea.y,
        calculatedPositions.signatureArea.width,
        calculatedPositions.signatureArea.height
      );
      
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        calculatedPositions.signatureArea.x,
        calculatedPositions.signatureArea.y,
        calculatedPositions.signatureArea.width,
        calculatedPositions.signatureArea.height
      );

      // 3. Area testo sigillo (indicatore posizione) - area rossa dall'immagine di riferimento
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Rosso trasparente
      ctx.fillRect(
        calculatedPositions.textArea.x - 2,
        calculatedPositions.textArea.y - calculatedPositions.textArea.height + 2,
        calculatedPositions.textArea.width,
        calculatedPositions.textArea.height
      );
      
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(
        calculatedPositions.textArea.x - 2,
        calculatedPositions.textArea.y - calculatedPositions.textArea.height + 2,
        calculatedPositions.textArea.width,
        calculatedPositions.textArea.height
      );

      // === ELEMENTI FINALI (come appariranno nel PDF) ===

      // 4. Firma elettronica (se presente)
      if (signature) {
        const signImg = new Image();
        signImg.onload = () => {
          // Centra la firma nel riquadro giallo
          const aspectRatio = signImg.width / signImg.height;
          let drawWidth = calculatedPositions.signatureArea.width * 0.8;
          let drawHeight = drawWidth / aspectRatio;
          
          if (drawHeight > calculatedPositions.signatureArea.height * 0.8) {
            drawHeight = calculatedPositions.signatureArea.height * 0.8;
            drawWidth = drawHeight * aspectRatio;
          }
          
          const centerX = calculatedPositions.signatureArea.x + 
                         (calculatedPositions.signatureArea.width - drawWidth) / 2;
          const centerY = calculatedPositions.signatureArea.y + 
                         (calculatedPositions.signatureArea.height - drawHeight) / 2;
          
          ctx.drawImage(signImg, centerX, centerY, drawWidth, drawHeight);
        };
        signImg.src = signature;
      }

      // 5. Testo sigillo/trasportatore
      if (sealNumber || transporterName) {
        ctx.font = `${calculatedPositions.textArea.fontSize}px Arial`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        
        let yOffset = 0;
        if (sealNumber) {
          ctx.fillText(
            `Sigillo: ${sealNumber}`, 
            calculatedPositions.textArea.x, 
            calculatedPositions.textArea.y + yOffset
          );
          yOffset -= calculatedPositions.textArea.fontSize + 2;
        }
        
        if (transporterName) {
          ctx.fillText(
            `Trasportatore: ${transporterName}`, 
            calculatedPositions.textArea.x, 
            calculatedPositions.textArea.y + yOffset
          );
        }
      }

      // Reset line dash
      ctx.setLineDash([]);
    };
    
    img.src = imageData;
  };

  useEffect(() => {
    drawPreview();
  }, [imageData, signature, sealNumber, transporterName]);

  // Genera PDF finale senza guide visive
  const generateFinalPDF = () => {
    if (!positions || !imageData) return null;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Disegna solo l'immagine originale
        ctx.drawImage(img, 0, 0);
        
        // Aggiungi firma (se presente)
        if (signature) {
          const signImg = new Image();
          signImg.onload = () => {
            // Centra la firma
            const aspectRatio = signImg.width / signImg.height;
            let drawWidth = positions.signatureArea.width * 0.8;
            let drawHeight = drawWidth / aspectRatio;
            
            if (drawHeight > positions.signatureArea.height * 0.8) {
              drawHeight = positions.signatureArea.height * 0.8;
              drawWidth = drawHeight * aspectRatio;
            }
            
            const centerX = positions.signatureArea.x + 
                           (positions.signatureArea.width - drawWidth) / 2;
            const centerY = positions.signatureArea.y + 
                           (positions.signatureArea.height - drawHeight) / 2;
            
            ctx.drawImage(signImg, centerX, centerY, drawWidth, drawHeight);
            
            // Aggiungi testo
            addTextToPDF(ctx);
            
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          signImg.src = signature;
        } else {
          // Solo testo senza firma
          addTextToPDF(ctx);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        }
      };
      
      img.src = imageData;
    });
  };

  const addTextToPDF = (ctx) => {
    if (sealNumber || transporterName) {
      ctx.font = `${positions.textArea.fontSize}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      
      let yOffset = 0;
      if (sealNumber) {
        ctx.fillText(
          `Sigillo: ${sealNumber}`, 
          positions.textArea.x, 
          positions.textArea.y + yOffset
        );
        yOffset -= positions.textArea.fontSize + 2;
      }
      
      if (transporterName) {
        ctx.fillText(
          `Trasportatore: ${transporterName}`, 
          positions.textArea.x, 
          positions.textArea.y + yOffset
        );
      }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: '8px'
        }}
      />
      
      {positions && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>📏 DPI: {Math.round(positions.dpi)}</div>
          <div>📄 A4: {positions.isA4Portrait ? '✅' : '⚠️'}</div>
          <div>📐 {dimensions?.width} × {dimensions?.height}px</div>
        </div>
      )}
      
      {/* Legenda guide visive */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        lineHeight: '1.4'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Guide Anteprima:</div>
        <div><span style={{color: '#3b82f6'}}>━━</span> Margini A4 (15-25mm)</div>
        <div><span style={{color: '#f59e0b'}}>▢</span> Area Firma (60×30mm)</div>
        <div><span style={{color: '#ef4444'}}>▢</span> Posizione Testo</div>
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
          Nel PDF finale: solo firma + testo
        </div>
      </div>
    </div>
  );
};

// Hook per generare PDF finale
export const useDocumentProcessor = () => {
  const generateProcessedPDF = async (pageData, signature, sealNumber, transporterName) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Calcola posizioni
        const A4_RATIO = 1.414;
        const assumedDPI = img.width / (210 / 25.4);
        const mmToPx = (mm) => (mm * assumedDPI) / 25.4;
        
        const signatureArea = {
          width: mmToPx(60),
          height: mmToPx(30),
          x: img.width - mmToPx(10) - mmToPx(60),
          y: img.height - mmToPx(10) - mmToPx(30)
        };

        const textArea = {
          x: mmToPx(12),
          y: img.height - mmToPx(12),
          fontSize: Math.max(12, mmToPx(3.5))
        };
        
        // Disegna immagine originale
        ctx.drawImage(img, 0, 0);
        
        // Aggiungi firma
        if (signature) {
          const signImg = new Image();
          signImg.onload = () => {
            const aspectRatio = signImg.width / signImg.height;
            let drawWidth = signatureArea.width * 0.8;
            let drawHeight = drawWidth / aspectRatio;
            
            if (drawHeight > signatureArea.height * 0.8) {
              drawHeight = signatureArea.height * 0.8;
              drawWidth = drawHeight * aspectRatio;
            }
            
            const centerX = signatureArea.x + (signatureArea.width - drawWidth) / 2;
            const centerY = signatureArea.y + (signatureArea.height - drawHeight) / 2;
            
            ctx.drawImage(signImg, centerX, centerY, drawWidth, drawHeight);
            
            // Aggiungi testo e risolvi
            addFinalText(ctx, textArea, sealNumber, transporterName);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          signImg.src = signature;
        } else {
          addFinalText(ctx, textArea, sealNumber, transporterName);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        }
      };
      
      img.src = pageData;
    });
  };

  const addFinalText = (ctx, textArea, sealNumber, transporterName) => {
    if (sealNumber || transporterName) {
      ctx.font = `${textArea.fontSize}px Arial`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      
      let yOffset = 0;
      if (sealNumber) {
        ctx.fillText(`Sigillo: ${sealNumber}`, textArea.x, textArea.y + yOffset);
        yOffset -= textArea.fontSize + 2;
      }
      
      if (transporterName) {
        ctx.fillText(`Trasportatore: ${transporterName}`, textArea.x, textArea.y + yOffset);
      }
    }
  };

  return { generateProcessedPDF };
};

export default DocumentPreview;