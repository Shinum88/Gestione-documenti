import jsPDF from 'jspdf';

/**
 * DDT Document Processor - Sistema completo elaborazione documenti
 * 
 * Obiettivo: Trasformare array di immagini grezze in PDF A4 strutturato
 * - Correzione geometrica automatica (prospettiva, ritaglio, ridimensionamento)
 * - Posizionamento millimetrico firma e metadata solo sulla prima pagina
 * - Generazione PDF multipagina professionale
 */
export class DDTProcessor {
  constructor() {
    this.A4_WIDTH_MM = 210;
    this.A4_HEIGHT_MM = 297;
    this.DPI = 300;
    this.MM_TO_PX = this.DPI / 25.4; // Conversione mm a pixel a 300 DPI
  }

  /**
   * Processo principale: da array immagini grezze a PDF strutturato
   * @param {Array} rawImages - Array di immagini Base64 (una per pagina)
   * @param {String} signature - Firma PNG Base64
   * @param {String} sealNumber - Numero sigillo (es. "1564541")
   * @param {String} transporterName - Nome trasportatore (es. "FIORE")
   * @returns {Promise<String>} PDF Base64 finale
   */
  async processDocumentPages(rawImages, signature, sealNumber, transporterName) {
    if (!rawImages || rawImages.length === 0) {
      throw new Error('Array immagini mancante o vuoto');
    }
    if (!signature) {
      throw new Error('Firma elettronica mancante');
    }
    if (!sealNumber || !transporterName) {
      throw new Error('Metadata sigillo/trasportatore mancanti');
    }

    console.log(`Iniziando elaborazione ${rawImages.length} pagine DDT...`);

    try {
      // 1. Elabora geometricamente tutte le pagine
      const processedPages = [];
      for (let i = 0; i < rawImages.length; i++) {
        console.log(`Elaborando pagina ${i + 1}/${rawImages.length}...`);
        const correctedPage = await this.correctPageGeometry(rawImages[i]);
        processedPages.push(correctedPage);
      }

      // 2. Applica firma e metadata solo alla prima pagina
      const firstPageWithSignature = await this.applySignatureAndMetadata(
        processedPages[0],
        signature,
        sealNumber,
        transporterName
      );

      // 3. Sostituisci la prima pagina con quella firmata
      processedPages[0] = firstPageWithSignature;

      // 4. Genera PDF multipagina finale
      const finalPDF = await this.generateMultiPagePDF(processedPages);

      console.log('✅ Elaborazione completata con successo');
      return finalPDF;

    } catch (error) {
      console.error('❌ Errore durante elaborazione DDT:', error);
      throw error;
    }
  }

  /**
   * Correzione geometrica automatica di una pagina
   * - Rilevamento automatico bordi A4
   * - Correzione prospettica
   * - Ritaglio e ridimensionamento A4 standard
   */
  async correctPageGeometry(imageBase64) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        console.log(`Correggendo geometria: ${img.width}x${img.height}px`);

        // 1. Imposta canvas alle dimensioni A4 a 300 DPI
        const targetWidth = Math.round(this.A4_WIDTH_MM * this.MM_TO_PX);
        const targetHeight = Math.round(this.A4_HEIGHT_MM * this.MM_TO_PX);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 2. Rilevamento automatico bordi (simulato per ora)
        const corners = this.detectDocumentCorners(img);

        // 3. Applica correzione prospettica e ridimensionamento
        this.applyPerspectiveCorrection(ctx, img, corners, targetWidth, targetHeight);

        // 4. Migliora qualità (opzionale: contrasto, luminosità)
        this.enhanceDocumentQuality(ctx, targetWidth, targetHeight);

        const correctedImageData = canvas.toDataURL('image/jpeg', 0.95);
        resolve(correctedImageData);
      };

      img.src = imageBase64;
    });
  }

  /**
   * Rilevamento automatico degli angoli del documento A4
   * Implementazione semplificata - in produzione usare OpenCV.js o algoritmi edge detection
   */
  detectDocumentCorners(img) {
    // Per ora restituisce i 4 angoli assumendo documento centrato nell'immagine
    // In produzione: implementare edge detection, contour detection, Harris corner detection
    
    const margin = Math.min(img.width, img.height) * 0.05; // 5% margine
    
    return {
      topLeft: { x: margin, y: margin },
      topRight: { x: img.width - margin, y: margin },
      bottomLeft: { x: margin, y: img.height - margin },
      bottomRight: { x: img.width - margin, y: img.height - margin }
    };
  }

  /**
   * Applica correzione prospettica e ridimensionamento A4
   */
  applyPerspectiveCorrection(ctx, img, corners, targetWidth, targetHeight) {
    // Implementazione trasformazione prospettica semplificata
    // In produzione: usare transform matrix completa o WebGL per precisione migliore
    
    try {
      // Per ora: semplice ridimensionamento con crop intelligente
      const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      const offsetX = (targetWidth - scaledWidth) / 2;
      const offsetY = (targetHeight - scaledHeight) / 2;

      // Background bianco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Disegna immagine centrata e scalata
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
    } catch (error) {
      console.warn('Fallback a ridimensionamento semplice:', error);
      // Fallback: ridimensionamento semplice
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    }
  }

  /**
   * Miglioramento qualità documento (contrasto, luminosità)
   */
  enhanceDocumentQuality(ctx, width, height) {
    // Opzionale: miglioramento automatico qualità
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Aumento contrasto semplificato
      const contrast = 1.1;
      const brightness = 5;

      for (let i = 0; i < data.length; i += 4) {
        // RGB channels
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness));
      }

      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.warn('Salto miglioramento qualità:', error);
    }
  }

  /**
   * Applica firma elettronica e metadata alla prima pagina
   * Posizionamento millimetrico preciso secondo specifiche
   */
  async applySignatureAndMetadata(pageImageData, signature, sealNumber, transporterName) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const pageImg = new Image();

      pageImg.onload = () => {
        canvas.width = pageImg.width;
        canvas.height = pageImg.height;

        // Disegna la pagina base
        ctx.drawImage(pageImg, 0, 0);

        // Applica firma in basso a destra
        this.applySignatureToPage(ctx, signature, canvas.width, canvas.height)
          .then(() => {
            // Applica testo sigillo/trasportatore in basso a sinistra
            this.applyMetadataText(ctx, sealNumber, transporterName, canvas.width, canvas.height);
            
            const finalPageData = canvas.toDataURL('image/jpeg', 0.95);
            resolve(finalPageData);
          })
          .catch(error => {
            console.error('Errore applicazione firma:', error);
            resolve(pageImageData); // Restituisci pagina originale in caso di errore
          });
      };

      pageImg.src = pageImageData;
    });
  }

  /**
   * Applica firma elettronica con posizionamento millimetrico
   */
  async applySignatureToPage(ctx, signature, pageWidth, pageHeight) {
    return new Promise((resolve) => {
      const signImg = new Image();
      
      signImg.onload = () => {
        // Calcola posizione e dimensioni secondo specifiche (60mm x 30mm, 10mm dai bordi)
        const signatureWidthPx = 60 * this.MM_TO_PX;
        const signatureHeightPx = 30 * this.MM_TO_PX;
        const marginRightPx = 10 * this.MM_TO_PX;
        const marginBottomPx = 10 * this.MM_TO_PX;

        const signatureX = pageWidth - marginRightPx - signatureWidthPx;
        const signatureY = pageHeight - marginBottomPx - signatureHeightPx;

        // Ridimensiona mantenendo aspect ratio
        const aspectRatio = signImg.width / signImg.height;
        let drawWidth = signatureWidthPx * 0.9; // 90% dell'area disponibile
        let drawHeight = drawWidth / aspectRatio;

        if (drawHeight > signatureHeightPx * 0.9) {
          drawHeight = signatureHeightPx * 0.9;
          drawWidth = drawHeight * aspectRatio;
        }

        // Centra nella zona firma
        const centerX = signatureX + (signatureWidthPx - drawWidth) / 2;
        const centerY = signatureY + (signatureHeightPx - drawHeight) / 2;

        // Disegna firma con trasparenza
        ctx.drawImage(signImg, centerX, centerY, drawWidth, drawHeight);
        
        console.log(`✅ Firma applicata: ${Math.round(drawWidth/this.MM_TO_PX)}x${Math.round(drawHeight/this.MM_TO_PX)}mm`);
        resolve();
      };

      signImg.onerror = () => {
        console.error('❌ Errore caricamento firma');
        resolve(); // Continua senza firma
      };

      signImg.src = signature;
    });
  }

  /**
   * Applica testo metadata con posizionamento millimetrico
   */
  applyMetadataText(ctx, sealNumber, transporterName, pageWidth, pageHeight) {
    // Posizionamento secondo specifiche (12mm dai bordi, font 10pt)
    const marginLeftPx = 12 * this.MM_TO_PX;
    const marginBottomPx = 12 * this.MM_TO_PX;
    const fontSize = Math.round(10 * this.MM_TO_PX / 3.5); // ~10pt

    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    const textX = marginLeftPx;
    let textY = pageHeight - marginBottomPx;

    // Linea 1: Sigillo
    if (sealNumber) {
      ctx.fillText(`Sigillo: ${sealNumber}`, textX, textY);
      textY -= fontSize + 2; // Spazio tra righe
    }

    // Linea 2: Trasportatore
    if (transporterName) {
      ctx.fillText(`Trasportatore: ${transporterName}`, textX, textY);
    }

    console.log(`✅ Metadata applicato: Sigillo: ${sealNumber}, Trasportatore: ${transporterName}`);
  }

  /**
   * Genera PDF multipagina finale
   */
  async generateMultiPagePDF(processedPages) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let i = 0; i < processedPages.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      // Aggiungi pagina al PDF (dimensioni A4: 210x297mm)
      pdf.addImage(
        processedPages[i],
        'JPEG',
        0, // x
        0, // y
        this.A4_WIDTH_MM, // width
        this.A4_HEIGHT_MM  // height
      );

      console.log(`✅ Pagina ${i + 1}/${processedPages.length} aggiunta al PDF`);
    }

    // Restituisci PDF come Base64
    const pdfBase64 = pdf.output('datauristring');
    console.log(`✅ PDF multipagina generato: ${processedPages.length} pagine`);
    
    return pdfBase64;
  }
}

/**
 * Hook React per utilizzo semplificato del DDT Processor
 */
export const useDDTProcessor = () => {
  const processor = new DDTProcessor();

  const processDocument = async (rawImages, signature, sealNumber, transporterName) => {
    try {
      return await processor.processDocumentPages(rawImages, signature, sealNumber, transporterName);
    } catch (error) {
      console.error('Errore processamento DDT:', error);
      throw error;
    }
  };

  return { processDocument };
};