// Utility per generare dati mock per testing dell'applicazione

// Genera un'immagine base64 semplice per testing
const generateMockImage = (width = 400, height = 600, text = 'DOCUMENTO') => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Background bianco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Bordo
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  
  // Testo
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height / 2);
  
  // Data
  ctx.font = '16px Arial';
  ctx.fillText(new Date().toLocaleDateString('it-IT'), width / 2, height / 2 + 40);
  
  return canvas.toDataURL('image/jpeg', 0.8);
};

// Genera firma mock
const generateMockSignature = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  // Background trasparente
  ctx.clearRect(0, 0, 200, 100);
  
  // Firma simulata
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(20, 70);
  ctx.quadraticCurveTo(50, 30, 80, 50);
  ctx.quadraticCurveTo(110, 70, 140, 40);
  ctx.quadraticCurveTo(160, 60, 180, 45);
  ctx.stroke();
  
  return canvas.toDataURL('image/png');
};

// Genera firma variante per diversi trasportatori
const generateVariantSignature = (variant = 1) => {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  // Background trasparente
  ctx.clearRect(0, 0, 200, 100);
  
  // Firme simulate diverse
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  if (variant === 1) {
    // Firma ondulata
    ctx.moveTo(15, 60);
    ctx.quadraticCurveTo(40, 30, 70, 60);
    ctx.quadraticCurveTo(100, 90, 130, 50);
    ctx.quadraticCurveTo(160, 20, 185, 60);
  } else if (variant === 2) {
    // Firma con picchi
    ctx.moveTo(20, 80);
    ctx.lineTo(50, 30);
    ctx.lineTo(80, 70);
    ctx.lineTo(110, 25);
    ctx.lineTo(140, 75);
    ctx.lineTo(170, 35);
  } else {
    // Firma circolare
    ctx.arc(100, 50, 30, 0, 2 * Math.PI);
    ctx.moveTo(70, 50);
    ctx.lineTo(130, 50);
  }
  ctx.stroke();
  
  return canvas.toDataURL('image/png');
};

// Dati mock per l'applicazione
export const mockData = {
  folders: [
    {
      _id: 'folder_1',
      name: 'Danesi_2025-01-20',
      terzista: 'Danesi',
      date: '2025-01-20T10:00:00.000Z',
      status: 'pending'
    },
    {
      _id: 'folder_2', 
      name: 'Happening_2025-01-20',
      terzista: 'Happening',
      date: '2025-01-20T11:00:00.000Z',
      status: 'pending'
    },
    {
      _id: 'folder_3',
      name: 'Almax_2025-01-19',
      terzista: 'Almax', 
      date: '2025-01-19T14:00:00.000Z',
      status: 'signed'
    },
    {
      _id: 'folder_4',
      name: 'Veliero_2025-01-18',
      terzista: 'Veliero',
      date: '2025-01-18T09:00:00.000Z', 
      status: 'signed'
    }
  ],
  
  documents: [
    {
      _id: 'doc_1',
      folderId: 'folder_1',
      name: 'Documento_001_Danesi',
      pages: [generateMockImage(400, 600, 'DOC DANESI 1')],
      signed: false,
      signature: null,
      sealNumber: null,
      transporterName: null,
      transporterCompany: null,
      createdAt: '2025-01-20T10:30:00.000Z'
    },
    {
      _id: 'doc_2', 
      folderId: 'folder_1',
      name: 'Documento_002_Danesi',
      pages: [generateMockImage(400, 600, 'DOC DANESI 2'), generateMockImage(400, 600, 'PAGINA 2')],
      signed: false,
      signature: null,
      sealNumber: null,
      transporterName: null,
      transporterCompany: null,
      createdAt: '2025-01-20T10:45:00.000Z'
    },
    {
      _id: 'doc_3',
      folderId: 'folder_2', 
      name: 'Documento_001_Happening',
      pages: [generateMockImage(400, 600, 'DOC HAPPENING')],
      signed: false,
      signature: null,
      sealNumber: null,
      transporterName: null,
      transporterCompany: null,
      createdAt: '2025-01-20T11:15:00.000Z'
    },
    {
      _id: 'doc_4',
      folderId: 'folder_3',
      name: 'Documento_001_Almax',
      pages: [generateMockImage(400, 600, 'DOC ALMAX FIRMATO')],
      signed: true,
      signature: { image: generateMockSignature() },
      sealNumber: 'AL2025001',
      transporterName: 'Mario Rossi',
      transporterCompany: 'Trasporti Rossi SRL',
      createdAt: '2025-01-19T14:30:00.000Z'
    },
    {
      _id: 'doc_5',
      folderId: 'folder_4',
      name: 'Documento_001_Veliero',
      pages: [generateMockImage(400, 600, 'DOC VELIERO FIRMATO')],
      signed: true, 
      signature: { image: generateVariantSignature(1) },
      sealNumber: null,
      transporterName: 'Giuseppe Bianchi',
      transporterCompany: 'Express Delivery',
      createdAt: '2025-01-18T09:30:00.000Z'
    },
    {
      _id: 'doc_6',
      folderId: 'folder_4',
      name: 'Documento_002_Veliero', 
      pages: [generateMockImage(400, 600, 'DOC VELIERO 2')],
      signed: true,
      signature: { image: generateVariantSignature(2) },
      sealNumber: 'VL2025007',
      transporterName: 'Luigi Verdi',
      transporterCompany: 'Corriere Espresso',
      createdAt: '2025-01-18T09:45:00.000Z'
    }
  ],
  
  // Trasportatori mock
  transporters: [
    {
      id: 'trans_1',
      name: 'Mario Rossi',
      company: 'Trasporti Rossi SRL',
      signature: generateMockSignature(),
      createdAt: '2025-01-15T08:00:00.000Z'
    },
    {
      id: 'trans_2',
      name: 'Giuseppe Bianchi',
      company: 'Express Delivery',
      signature: generateVariantSignature(1),
      createdAt: '2025-01-16T09:00:00.000Z'
    },
    {
      id: 'trans_3',
      name: 'Luigi Verdi',
      company: 'Corriere Espresso',
      signature: generateVariantSignature(2),
      createdAt: '2025-01-17T10:00:00.000Z'
    }
  ]
};

// Funzione per inizializzare i dati mock nell'app
export const initializeMockData = (setFolders, setDocuments, setTransporters = null) => {
  // Controlla se già ci sono dati
  const existingFolders = JSON.parse(localStorage.getItem('mockFolders') || '[]');
  const existingDocuments = JSON.parse(localStorage.getItem('mockDocuments') || '[]');
  const existingTransporters = JSON.parse(localStorage.getItem('transporters') || '[]');
  
  if (existingFolders.length === 0) {
    localStorage.setItem('mockFolders', JSON.stringify(mockData.folders));
    localStorage.setItem('mockDocuments', JSON.stringify(mockData.documents));
    localStorage.setItem('transporters', JSON.stringify(mockData.transporters));
    
    setFolders(mockData.folders);
    setDocuments(mockData.documents);
    if (setTransporters) setTransporters(mockData.transporters);
    
    return true; // Dati inizializzati
  } else {
    setFolders(existingFolders);
    setDocuments(existingDocuments);
    if (setTransporters) setTransporters(existingTransporters);
    
    return false; // Dati già esistenti
  }
};

// Funzione per resettare i dati mock
export const resetMockData = (setFolders, setDocuments, setTransporters = null) => {
  localStorage.removeItem('mockFolders');
  localStorage.removeItem('mockDocuments');
  localStorage.removeItem('transporters');
  
  const initialized = initializeMockData(setFolders, setDocuments, setTransporters);
  return initialized;
};