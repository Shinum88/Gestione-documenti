# DOCUMENTAZIONE COMPLETA - APPLICAZIONE GESTIONE DOCUMENTI LOGISTICA

## 📋 INDICE
1. [Panoramica Generale](#panoramica-generale)
2. [Struttura del Progetto](#struttura-del-progetto)
3. [Architettura Dati](#architettura-dati)
4. [Ruoli Utente e Workflow](#ruoli-utente-e-workflow)
5. [Componenti Principali](#componenti-principali)
6. [Sistema di Firma e Sigillo](#sistema-di-firma-e-sigillo)
7. [Elaborazione Documenti con OpenCV](#elaborazione-documenti-con-opencv)
8. [Sistema di Export PDF/ZIP](#sistema-di-export-pdf-zip)
9. [Gestione Stato e Persistenza](#gestione-stato-e-persistenza)

---

## 📌 PANORAMICA GENERALE

### Descrizione
Applicazione web per la gestione di documenti di trasporto (DDT) ottimizzata per tablet iOS/Android. Il sistema gestisce il flusso completo dalla scansione del documento da parte dell'operatore fino alla firma digitale e all'esportazione da parte del responsabile carico merci.

### Tecnologie Utilizzate
- **Frontend**: React.js (Create React App)
- **UI**: Custom CSS + Shadcn UI components
- **Elaborazione Immagini**: OpenCV.js (v4.x)
- **PDF Generation**: jsPDF
- **Compressione**: JSZip
- **State Management**: React Context API + localStorage
- **Routing**: React Router v6
- **Notifiche**: Sonner (toast notifications)

---

## 🗂️ STRUTTURA DEL PROGETTO

```
/app/frontend/
│
├── public/
│   ├── index.html              # HTML principale
│   ├── opencv.js               # OpenCV.js library (11MB) scaricata localmente
│   ├── test-document.jpg       # Immagine di test
│   └── test-document.svg       # SVG di test
│
├── src/
│   ├── App.js                  # Componente principale + routing
│   ├── App.css                 # Stili globali
│   ├── index.js                # Entry point React
│   ├── index.css               # Stili base
│   │
│   ├── components/             # Componenti React
│   │   ├── Login.js            # Autenticazione utente
│   │   ├── OperatorDashboard.js      # Dashboard operatore
│   │   ├── CameraScanner.js          # Scanner fotocamera + workflow multipagina
│   │   ├── DocumentScanner.js        # Elaborazione OpenCV + correzione prospettica
│   │   ├── CargoManagerDashboard.js  # Dashboard carico merci
│   │   ├── SignatureModal.js         # Modale firma avanzato (nuovo)
│   │   ├── SignatureCanvas.js        # Canvas per disegno firma manuale
│   │   ├── TransporterManager.js     # Gestione trasportatori
│   │   ├── DocumentPreview.js        # Anteprima documenti (legacy)
│   │   ├── DocumentSignatureManager.js # Gestione firma (legacy)
│   │   ├── DDTProcessor.js           # Processore DDT (legacy)
│   │   └── ui/                       # Componenti Shadcn UI
│   │
│   ├── contexts/
│   │   └── OpenCVContext.js    # Context globale OpenCV (singleton pattern)
│   │
│   ├── hooks/
│   │   └── use-toast.js        # Hook per notifiche toast
│   │
│   ├── lib/
│   │   └── utils.js            # Utility functions
│   │
│   └── utils/
│       ├── mockData.js         # Dati mock + funzioni inizializzazione
│       └── opencvLoader.js     # Loader OpenCV (legacy, ora usa Context)
│
├── package.json                # Dipendenze npm
├── tailwind.config.js          # Configurazione Tailwind CSS
├── craco.config.js             # Configurazione CRACO
└── yarn.lock                   # Lock file dipendenze
```

---

## 💾 ARCHITETTURA DATI

### Struttura Dati - FOLDERS (Cartelle)
```javascript
{
  _id: string,              // ID univoco cartella
  name: string,             // Nome cartella (es: "Danesi_2025-01-20")
  terzista: string,         // Nome terzista/contractor
  date: string (ISO),       // Data creazione
  status: 'pending' | 'signed'  // Stato: in attesa o firmata
}
```

### Struttura Dati - DOCUMENTS (Documenti)
```javascript
{
  _id: string,              // ID univoco documento
  folderId: string,         // ID cartella di appartenenza
  name: string,             // Nome documento (es: "Documento_001_Danesi")
  pages: [string],          // Array di immagini base64 (una per pagina)
  signed: boolean,          // true se firmato, false se in attesa
  signature: {              // Oggetto firma (null se non firmato)
    type: 'registered' | 'manual',    // Tipo firma
    image: string (base64),           // Immagine firma
    transporterName: string,          // Nome trasportatore
    seal: {                           // Sigillo opzionale
      transporterName: string,        // Nome per sigillo
      number: string                  // Numero sigillo (es: "TR-2025-001")
    }
  },
  processedByOperator: boolean,       // true se elaborato da operatore
  createdAt: string (ISO),            // Data creazione
  signedAt: string (ISO)              // Data firma (se firmato)
}
```

### Struttura Dati - TRANSPORTERS (Trasportatori)
```javascript
{
  id: string,               // ID univoco trasportatore
  name: string,             // Nome trasportatore (es: "Mario Rossi")
  company: string,          // Azienda (es: "Trasporti Rossi SRL")
  signature: string (base64), // Firma pre-registrata
  createdAt: string (ISO)   // Data registrazione
}
```

### Persistenza Dati (localStorage)
```javascript
// Chiavi localStorage utilizzate:
localStorage.getItem('mockFolders')      // Array di folders
localStorage.getItem('mockDocuments')    // Array di documents
localStorage.getItem('transporters')     // Array di transporters
```

---

## 👥 RUOLI UTENTE E WORKFLOW

### RUOLO 1: OPERATORE (operatore)

**Credenziali:**
- Username: `operatore`
- Password: `Welcome00`

**Workflow Completo:**

1. **Login**
   - Componente: `Login.js`
   - Route: `/login`
   - Verifica credenziali hardcoded
   - Redirect a: `/operator`

2. **Dashboard Operatore**
   - Componente: `OperatorDashboard.js`
   - Route: `/operator`
   - Visualizza lista terzisti (folders)
   - Bottone "Nuovo Documento" per ogni terzista
   - Click → naviga a `/scanner` con `currentFolder` settato

3. **Scanner Fotocamera**
   - Componente: `CameraScanner.js`
   - Route: `/scanner`
   - Gestisce workflow multipagina:
     - Cattura foto (camera o upload file)
     - Ogni foto → apre `DocumentScanner` per elaborazione
     - Elabora pagina → scelta: "Pagina Successiva" o "Concludi e Invia"
     - Anteprima finale di tutte le pagine
     - Salvataggio documento in `documents` array

4. **Elaborazione Documento**
   - Componente: `DocumentScanner.js`
   - Modal che appare dopo ogni foto
   - Flusso:
     - Mostra immagine originale (sinistra)
     - Operatore seleziona 4 angoli manualmente (SEMPRE manuale, no auto)
     - Click "⚙️ Elabora (4/4 angoli)"
     - OpenCV applica: correzione prospettica + filtri scanner
     - Mostra immagine elaborata (destra)
     - Scelta: "➕ Pagina Successiva" o "✅ Concludi e Invia"

5. **Salvataggio Documento**
   - Funzione: `confirmAndSave()` in `CameraScanner.js`
   - Crea oggetto documento con:
     ```javascript
     {
       _id: Date.now().toString(),
       folderId: currentFolder._id,
       name: `Documento_${Date.now()}`,
       pages: [base64_page1, base64_page2, ...],
       signed: false,              // IMPORTANTE: sempre false
       signature: null,
       processedByOperator: true   // Flag operatore
     }
     ```
   - Aggiunge a `documents` array
   - Salva in localStorage
   - Ritorna a dashboard operatore

---

### RUOLO 2: CARICO MERCI (carico_merci)

**Credenziali:**
- Username: `carico merci` (con spazio!)
- Password: `Welcome00`

**Workflow Completo:**

1. **Login**
   - Stesso componente `Login.js`
   - Verifica credenziali
   - Redirect a: `/cargo-manager`

2. **Dashboard Carico Merci**
   - Componente: `CargoManagerDashboard.js`
   - Route: `/cargo-manager`
   - Features principali:

   **a) Tab e Filtri**
   ```javascript
   activeTab: 'pending' | 'signed'   // Tab attiva
   terzistaFilter: string            // Filtro per terzista
   dateFilter: {start, end}          // Filtro date
   ```

   **b) Visualizzazione Folders**
   - Filtrati per `status` (pending/signed)
   - Ogni folder mostra:
     - Nome folder
     - Data
     - Status badge (verde=firmato, giallo=in attesa)
     - Lista documenti del folder
   
   **c) Selezione Documenti**
   - Checkbox per ogni documento
   - Multi-selezione possibile
   - Action bar appare quando ≥1 documento selezionato

3. **Gestione Trasportatori**
   - Componente: `TransporterManager.js`
   - Bottone: "Gestisci Trasportatori"
   - Features:
     - Aggiungi nuovo trasportatore (nome + azienda)
     - Disegna firma con `SignatureCanvas`
     - Salva in localStorage `transporters`
     - Elimina trasportatore esistente

4. **Applicazione Firma Unica**
   - Componente: `SignatureModal.js` (NUOVO sistema)
   - Bottone: "✍️ Applica Firma Unica"
   - Appare solo se documenti selezionati NON firmati

   **Modale Firma - Sezioni:**

   **SEZIONE 1: Tipo Firma**
   - Radio buttons:
     - ⚪ Trasportatore Registrato
     - ⚪ Firma Manuale
   
   - Se "Trasportatore Registrato":
     - Dropdown con lista trasportatori da localStorage
     - Anteprima firma sotto il dropdown
   
   - Se "Firma Manuale":
     - Bottone "✍️ Disegna Firma Manuale"
     - Apre `SignatureCanvas` per disegno
     - Salva e mostra anteprima

   **SEZIONE 2: Numero Sigillo (Opzionale)**
   - Background giallo chiaro (#fef3c7)
   - Campi:
     - Nome Trasportatore (text input)
     - N° Sigillo (text input)
   - Anteprima sigillo in tempo reale
   - **IMPORTANTE**: Campi opzionali, permette salvataggio senza

   **Conferma Firma:**
   - Pulsante: "✅ Applica Firma a Documenti Selezionati"
   - Validazioni:
     - Trasportatore registrato: deve essere selezionato
     - Firma manuale: deve essere disegnata
     - Sigillo: OPZIONALE
   - Crea oggetto `signatureData`:
     ```javascript
     {
       type: 'registered' | 'manual',
       image: base64_signature,
       transporterName: string,
       seal: {                    // solo se compilato
         transporterName: string,
         number: string
       }
     }
     ```

5. **Aggiornamento Documenti Firmati**
   - Funzione: `applySignatureToSelectedDocuments()`
   - Per ogni documento selezionato:
     ```javascript
     {
       ...doc,
       signed: true,
       signature: signatureData,    // oggetto completo
       signedAt: new Date().toISOString()
     }
     ```
   - Salva in `documents` array
   - Aggiorna `folder.status` se tutti documenti firmati
   - Toast: "X documenti firmati con successo"
   - Documenti spostati da tab "In Attesa" a "Firmati"

6. **Visualizzazione Documenti Firmati**
   - Tab: "Firmati"
   - Ogni documento mostra:
     ```
     Documento_001_Danesi (1 pag.)
     ✓ Firmato da: Mario Rossi
     🏷️ Sigillo: TR-2025-001    ← ARANCIONE (#f59e0b)
     ```
   - Badge verde "✓ Firmato" a destra

7. **Download ZIP**
   - Bottone: "⬇️ Scarica ZIP Documenti Firmati (N)"
   - Appare solo se documenti firmati selezionati
   - Funzione: `downloadSelectedAsZip()`

---

## 🎨 COMPONENTI PRINCIPALI

### 1. App.js (Main Application)

**Responsabilità:**
- Entry point applicazione
- Gestione routing
- Context provider globale
- Inizializzazione dati mock

**Context Globale (AppContext):**
```javascript
{
  user: {role, username},        // Utente loggato
  setUser: function,
  currentFolder: object,          // Folder selezionato dall'operatore
  setCurrentFolder: function,
  currentDocument: {pages: []},   // Documento in costruzione
  setCurrentDocument: function,
  folders: [],                    // Tutti i folders
  setFolders: function,
  documents: [],                  // Tutti i documenti
  setDocuments: function
}
```

**Routes:**
- `/login` → `Login.js`
- `/operator` → `OperatorDashboard.js` (protected)
- `/scanner` → `CameraScanner.js` (protected)
- `/cargo-manager` → `CargoManagerDashboard.js` (protected)
- `/` → Redirect basato su ruolo

**Wrapping:**
```jsx
<OpenCVProvider>           {/* OpenCV singleton */}
  <AppContext.Provider>    {/* State globale */}
    <BrowserRouter>        {/* Routing */}
      <Routes>...</Routes>
    </BrowserRouter>
    <Toaster />            {/* Notifiche */}
  </AppContext.Provider>
</OpenCVProvider>
```

---

### 2. OpenCVContext.js (OpenCV Singleton Manager)

**Problema Risolto:**
Prima OpenCV.js veniva caricato più volte causando:
`BindingError: Cannot register public name 'IntVector' twice`

**Soluzione:**
Pattern singleton con React Context che carica OpenCV UNA SOLA VOLTA.

**Implementazione:**
```javascript
// Context
const OpenCVContext = createContext(null);

// Hook per usare OpenCV
export const useOpenCV = () => {
  const context = useContext(OpenCVContext);
  return context; // { opencv, isLoading, error, isReady }
};

// Provider
export const OpenCVProvider = ({ children }) => {
  const [opencv, setOpencv] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Controlla se OpenCV già disponibile
    if (window.cv && window.cv.Mat) {
      setOpencv(window.cv);
      setIsLoading(false);
      return;
    }

    // 2. Controlla se script già presente
    const existingScript = document.getElementById('opencv-global-script');
    if (existingScript) {
      // Polling per verificare inizializzazione
      const checkInterval = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          setOpencv(window.cv);
          setIsLoading(false);
          clearInterval(checkInterval);
        }
      }, 100);
      return;
    }

    // 3. Carica OpenCV.js dalla cartella public
    const script = document.createElement('script');
    script.src = '/opencv.js';  // File locale 11MB
    script.async = true;
    script.id = 'opencv-global-script';
    
    script.onload = () => {
      // Attendi runtime initialization
      if (window.cv && window.cv.Mat) {
        setOpencv(window.cv);
        setIsLoading(false);
      } else {
        // Polling
        const waitForOpenCV = () => {
          if (window.cv && window.cv.Mat) {
            setOpencv(window.cv);
            setIsLoading(false);
          } else {
            setTimeout(waitForOpenCV, 100);
          }
        };
        waitForOpenCV();
      }
    };

    script.onerror = (error) => {
      setError('Impossibile caricare OpenCV.js');
      setIsLoading(false);
    };

    document.head.appendChild(script);
  }, []);

  return (
    <OpenCVContext.Provider value={{ opencv, isLoading, error, isReady: opencv !== null }}>
      {children}
    </OpenCVContext.Provider>
  );
};
```

**Uso nei Componenti:**
```javascript
import { useOpenCV } from '../contexts/OpenCVContext';

const MyComponent = () => {
  const { opencv, isLoading, error, isReady } = useOpenCV();

  if (isLoading) return <div>Caricamento OpenCV...</div>;
  if (error) return <div>Errore: {error}</div>;

  // Usa opencv qui
  const mat = opencv.imread(canvas);
  // ...
};
```

---

### 3. Login.js

**Funzionalità:**
- Form login con username e password
- Validazione hardcoded
- Redirect basato su ruolo

**Credenziali Hardcoded:**
```javascript
const credentials = [
  { username: 'operatore', password: 'Welcome00', role: 'operatore' },
  { username: 'carico merci', password: 'Welcome00', role: 'carico_merci' }
];
```

**Processo Login:**
```javascript
const handleLogin = (e) => {
  e.preventDefault();
  
  const user = credentials.find(
    c => c.username === username && c.password === password
  );

  if (user) {
    setUser({ username: user.username, role: user.role });
    
    if (user.role === 'operatore') {
      navigate('/operator');
    } else {
      navigate('/cargo-manager');
    }
  } else {
    toast.error('Credenziali non valide');
  }
};
```

---

### 4. OperatorDashboard.js

**Responsabilità:**
- Visualizza lista terzisti (folders)
- Avvia processo scansione
- Logout

**Features:**
```javascript
// Carica folders da context
const { folders, setCurrentFolder } = useAppContext();

// Filtra solo folders pending (non firmati)
const pendingFolders = folders.filter(f => f.status === 'pending');

// Click su terzista
const handleFolderClick = (folder) => {
  setCurrentFolder(folder);
  navigate('/scanner');  // Vai allo scanner
};

// Logout
const handleLogout = () => {
  setUser(null);
  navigate('/login');
};
```

**UI:**
- Header: titolo + bottone logout
- Lista folders:
  - Nome terzista
  - Data
  - Numero documenti pendenti
  - Bottone "📄 Nuovo Documento"

---

### 5. CameraScanner.js (Workflow Multipagina)

**Responsabilità Principali:**
- Gestisce fotocamera/upload
- Orchestrazione workflow multipagina
- Apre DocumentScanner per ogni pagina
- Anteprima finale
- Salvataggio documento

**Stati React:**
```javascript
const [isScanning, setIsScanning] = useState(true);
const [currentPhoto, setCurrentPhoto] = useState(null);
const [processedPages, setProcessedPages] = useState([]);  // Array pagine elaborate
const [showDocumentScanner, setShowDocumentScanner] = useState(false);
const [showPreview, setShowPreview] = useState(false);
const [cameraError, setCameraError] = useState(false);
```

**Refs:**
```javascript
const videoRef = useRef(null);      // Stream video camera
const canvasRef = useRef(null);     // Canvas per cattura foto
const fileInputRef = useRef(null);  // Input file upload
```

**Funzioni Principali:**

1. **startCamera()** - Avvia camera
```javascript
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }  // Camera posteriore
    });
    videoRef.current.srcObject = stream;
  } catch (error) {
    setCameraError(true);
  }
};
```

2. **stopCamera()** - Ferma camera
```javascript
const stopCamera = () => {
  if (videoRef.current && videoRef.current.srcObject) {
    const tracks = videoRef.current.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
};
```

3. **capturePhoto()** - Cattura foto da camera
```javascript
const capturePhoto = () => {
  const canvas = canvasRef.current;
  const video = videoRef.current;
  const context = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL('image/jpeg', 0.8);

  // Mostra IMMEDIATAMENTE DocumentScanner
  setCurrentPhoto(imageData);
  setShowDocumentScanner(true);
  setIsScanning(false);
};
```

4. **handleFileSelect()** - Upload file
```javascript
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCurrentPhoto(e.target.result);
      setShowDocumentScanner(true);
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  }
};
```

5. **handlePageProcessed()** - Pagina elaborata
```javascript
const handlePageProcessed = (processedImageData) => {
  setProcessedPages(prev => [...prev, processedImageData]);
  setShowDocumentScanner(false);
  setCurrentPhoto(null);
  
  toast.success(`Pagina ${processedPages.length + 1} elaborata con successo`);
};
```

6. **addNextPage()** - Aggiungi pagina
```javascript
const addNextPage = () => {
  setIsScanning(true);
  toast.info('Scatta la prossima pagina');
};
```

7. **concludeAndShowPreview()** - Mostra anteprima
```javascript
const concludeAndShowPreview = (finalPageImage = null) => {
  if (finalPageImage) {
    setProcessedPages(prev => [...prev, finalPageImage]);
  }
  
  setShowDocumentScanner(false);
  setCurrentPhoto(null);
  setShowPreview(true);
};
```

8. **confirmAndSave()** - Salvataggio finale
```javascript
const confirmAndSave = () => {
  const finalDocument = {
    _id: Date.now().toString(),
    folderId: currentFolder._id,
    name: `Documento_${Date.now()}`,
    pages: processedPages,              // Array immagini elaborate
    signed: false,                      // SEMPRE false
    signature: null,
    processedByOperator: true,
    createdAt: new Date().toISOString()
  };

  // Aggiungi a documents
  setDocuments(prev => [...prev, finalDocument]);

  // Salva in localStorage
  localStorage.setItem('mockDocuments', JSON.stringify([...documents, finalDocument]));

  toast.success(`Documento con ${processedPages.length} pagine salvato!`);

  // Cleanup e navigazione
  stopCamera();
  setProcessedPages([]);
  setShowPreview(false);
  navigate('/operator');
};
```

**Workflow Completo:**
```
1. Cattura foto → setCurrentPhoto()
2. Apre DocumentScanner → setShowDocumentScanner(true)
3. Operatore seleziona 4 angoli
4. Click "Elabora" → OpenCV processa immagine
5. Scelta utente:
   a) "Pagina Successiva" → handlePageProcessed() → torna al punto 1
   b) "Concludi e Invia" → concludeAndShowPreview(finalImage)
6. Mostra anteprima griglia con tutte le pagine
7. Click "Conferma e Salva" → confirmAndSave()
8. Documento salvato → navigate('/operator')
```

---

### 6. DocumentScanner.js (Elaborazione OpenCV)

**Responsabilità:**
- Carica immagine
- Permette selezione manuale 4 angoli
- Applica correzione prospettica con OpenCV
- Applica filtri da scanner
- Mostra preview side-by-side

**Props:**
```javascript
{
  imageData: string (base64),          // Immagine da elaborare
  onProcessed: function(image),        // Callback pagina elaborata
  onCancel: function(),                // Callback annulla
  onNextPage: function(),              // Callback "Pagina Successiva"
  onFinish: function(image),           // Callback "Concludi e Invia"
  showMultiPageOptions: boolean        // Mostra opzioni multipagina
}
```

**Stati:**
```javascript
const [isProcessing, setIsProcessing] = useState(false);
const [corners, setCorners] = useState(null);              // 4 angoli selezionati
const [manualMode, setManualMode] = useState(false);
const [selectedCorners, setSelectedCorners] = useState([]); // Array 0-4 punti
const [processedImage, setProcessedImage] = useState(null); // Risultato finale
```

**Refs:**
```javascript
const canvasRef = useRef(null);          // Canvas immagine elaborata
const originalCanvasRef = useRef(null);  // Canvas immagine originale
```

**Hook OpenCV:**
```javascript
const { opencv, isLoading: isOpenCVLoading, error: openCVError } = useOpenCV();
```

**Inizializzazione (SEMPRE Manuale):**
```javascript
useEffect(() => {
  if (opencv && imageData && !isOpenCVLoading) {
    const img = new Image();
    img.onload = () => {
      // Prepara canvas originale
      const originalCanvas = originalCanvasRef.current;
      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      const originalCtx = originalCanvas.getContext('2d');
      originalCtx.drawImage(img, 0, 0);

      toast.info('Clicca sui 4 angoli del documento nell\'ordine: Alto-Sinistra, Alto-Destra, Basso-Destra, Basso-Sinistra');
      
      setManualMode(true);  // Attiva modalità manuale
    };
    
    img.src = imageData;
  }
}, [opencv, imageData, isOpenCVLoading]);
```

**Selezione Manuale Angoli:**
```javascript
const handleCanvasClick = (e) => {
  if (!manualMode || selectedCorners.length >= 4) return;

  const canvas = originalCanvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Calcola coordinate relative
  const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));

  const newCorners = [...selectedCorners, { x, y }];
  setSelectedCorners(newCorners);

  if (newCorners.length === 4) {
    toast.success('4 angoli selezionati! Clicca "Elabora"');
  }
};
```

**Elaborazione Manuale:**
```javascript
const processManualSelection = () => {
  if (selectedCorners.length !== 4) {
    toast.error('Seleziona tutti e 4 gli angoli');
    return;
  }

  setIsProcessing(true);

  try {
    const originalCanvas = originalCanvasRef.current;
    const src = opencv.imread(originalCanvas);

    // Ordina punti: TL, TR, BR, BL
    const orderedCorners = orderPoints(selectedCorners);
    setCorners(orderedCorners);

    // Applica correzione prospettica
    const correctedImage = applyPerspectiveCorrection(src, orderedCorners);
    setProcessedImage(correctedImage);

    // Cleanup
    src.delete();

    toast.success('Documento elaborato con successo!');
  } catch (error) {
    console.error('Errore elaborazione:', error);
    toast.error('Errore durante l\'elaborazione');
  } finally {
    setIsProcessing(false);
  }
};
```

**Ordinamento Punti:**
```javascript
const orderPoints = (points) => {
  // Metodo basato su somma e differenza coordinate
  const sortedBySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const topLeft = sortedBySum[0];
  const bottomRight = sortedBySum[3];
  
  const sortedByDiff = [...points].sort((a, b) => (a.y - a.x) - (b.y - b.x));
  const topRight = sortedByDiff[0];
  const bottomLeft = sortedByDiff[3];
  
  return [topLeft, topRight, bottomRight, bottomLeft];
};
```

**Correzione Prospettica:**
```javascript
const applyPerspectiveCorrection = (src, corners) => {
  // Calcola dimensioni documento
  const width = Math.round(Math.max(
    distance(corners[0], corners[1]),
    distance(corners[3], corners[2])
  ));
  const height = Math.round(Math.max(
    distance(corners[0], corners[3]),
    distance(corners[1], corners[2])
  ));

  // Punti sorgente (angoli rilevati)
  const srcPoints = opencv.matFromArray(4, 1, opencv.CV_32FC2, [
    corners[0].x, corners[0].y,  // TL
    corners[1].x, corners[1].y,  // TR
    corners[2].x, corners[2].y,  // BR
    corners[3].x, corners[3].y   // BL
  ]);

  // Punti destinazione (rettangolo perfetto)
  const dstPoints = opencv.matFromArray(4, 1, opencv.CV_32FC2, [
    0, 0,
    width, 0,
    width, height,
    0, height
  ]);

  // Matrice trasformazione
  const transformMatrix = opencv.getPerspectiveTransform(srcPoints, dstPoints);

  // Applica trasformazione
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

  // Applica filtri scanner
  const processed = applyDocumentFilters(corrected);

  // Mostra nel canvas
  displayProcessedImage(processed);

  // Cleanup
  srcPoints.delete();
  dstPoints.delete();
  transformMatrix.delete();
  corrected.delete();

  return processed;
};
```

**Filtri Scanner:**
```javascript
const applyDocumentFilters = (src) => {
  // 1. Scala di grigi
  const gray = new opencv.Mat();
  opencv.cvtColor(src, gray, opencv.COLOR_RGBA2GRAY);

  // 2. Aumenta contrasto
  const enhanced = new opencv.Mat();
  const alpha = 1.3;
  const beta = 10;
  opencv.convertScaleAbs(gray, enhanced, alpha, beta);

  // 3. Riduzione rumore
  const denoised = new opencv.Mat();
  opencv.GaussianBlur(enhanced, denoised, new opencv.Size(3, 3), 0);

  // 4. Sharpening
  const kernel = opencv.matFromArray(3, 3, opencv.CV_32F, [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ]);
  const sharpened = new opencv.Mat();
  opencv.filter2D(denoised, sharpened, -1, kernel);

  // 5. Soglia adattiva delicata
  const adaptive = new opencv.Mat();
  opencv.adaptiveThreshold(
    sharpened,
    adaptive,
    255,
    opencv.ADAPTIVE_THRESH_GAUSSIAN_C,
    opencv.THRESH_BINARY,
    21,  // blockSize
    4    // C
  );

  // 6. Operazione morfologica minima
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

  return morphed;
};
```

**Display Immagine Elaborata:**
```javascript
const displayProcessedImage = (processedMat) => {
  const canvas = canvasRef.current;
  opencv.imshow(canvas, processedMat);
};
```

**Conferma Risultato:**
```javascript
const confirmResult = () => {
  if (!processedImage) return;

  try {
    const canvas = canvasRef.current;
    const processedImageData = canvas.toDataURL('image/jpeg', 0.9);

    onProcessed(processedImageData);  // Callback con immagine
  } catch (error) {
    console.error('Errore conferma:', error);
    toast.error('Errore durante il salvataggio');
  }
};
```

**UI - Pulsanti Multipagina:**
```javascript
{showMultiPageOptions && (
  <>
    <button onClick={() => {
      confirmResult();
      if (onNextPage) onNextPage();
    }}>
      ➕ Pagina Successiva
    </button>
    
    <button onClick={() => {
      // Passa immagine finale a onFinish
      const canvas = canvasRef.current;
      const processedImageData = canvas.toDataURL('image/jpeg', 0.9);
      if (onFinish) onFinish(processedImageData);
    }}>
      ✅ Concludi e Invia
    </button>
  </>
)}
```

---

### 7. CargoManagerDashboard.js

**Responsabilità:**
- Visualizza folders e documenti
- Filtra per tab/terzista/data
- Gestione trasportatori
- Applicazione firma
- Download ZIP

**Stati Principali:**
```javascript
const [folders, setFolders] = useState([]);
const [documents, setDocuments] = useState([]);
const [transporters, setTransporters] = useState([]);
const [selectedDocuments, setSelectedDocuments] = useState(new Set());
const [activeTab, setActiveTab] = useState('pending');
const [terzistaFilter, setTerzistaFilter] = useState('');
const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
const [showTransporterManager, setShowTransporterManager] = useState(false);
const [showSignatureModal, setShowSignatureModal] = useState(false);
const [loading, setLoading] = useState(false);
```

**Caricamento Dati:**
```javascript
useEffect(() => {
  // Carica da localStorage
  const savedFolders = JSON.parse(localStorage.getItem('mockFolders') || '[]');
  const savedDocuments = JSON.parse(localStorage.getItem('mockDocuments') || '[]');
  const savedTransporters = JSON.parse(localStorage.getItem('transporters') || '[]');
  
  setFolders(savedFolders);
  setDocuments(savedDocuments);
  setTransporters(savedTransporters);
}, []);
```

**Filtro Folders:**
```javascript
const filteredFolders = useMemo(() => {
  let filtered = folders.filter(folder => folder.status === activeTab);
  
  // Filtro terzista
  if (terzistaFilter) {
    filtered = filtered.filter(f => f.terzista === terzistaFilter);
  }
  
  // Filtro data
  if (dateFilter.start || dateFilter.end) {
    filtered = filtered.filter(folder => {
      const folderDate = new Date(folder.date).toDateString();
      const startDate = dateFilter.start ? new Date(dateFilter.start).toDateString() : null;
      const endDate = dateFilter.end ? new Date(dateFilter.end).toDateString() : null;
      
      if (startDate && endDate) {
        return folderDate >= startDate && folderDate <= endDate;
      } else if (startDate) {
        return folderDate >= startDate;
      } else if (endDate) {
        return folderDate <= endDate;
      }
      return true;
    });
  }
  
  return filtered;
}, [folders, activeTab, terzistaFilter, dateFilter]);
```

**Gestione Selezione:**
```javascript
const handleDocumentSelect = (docId, checked) => {
  setSelectedDocuments(prev => {
    const newSet = new Set(prev);
    if (checked) {
      newSet.add(docId);
    } else {
      newSet.delete(docId);
    }
    return newSet;
  });
};

const handleSelectAll = () => {
  const allDocs = documents.map(d => d._id);
  setSelectedDocuments(new Set(allDocs));
};

const handleDeselectAll = () => {
  setSelectedDocuments(new Set());
};
```

**Applicazione Firma:**
```javascript
const handleApplySignature = () => {
  if (selectedDocuments.size === 0) {
    toast.error('Seleziona almeno un documento');
    return;
  }

  const selectedDocs = documents.filter(doc => selectedDocuments.has(doc._id));
  const alreadySigned = selectedDocs.filter(doc => doc.signed);
  
  if (alreadySigned.length > 0) {
    toast.error('Alcuni documenti sono già firmati');
    return;
  }

  setShowSignatureModal(true);
};

const handleSignatureConfirm = (signatureData) => {
  setShowSignatureModal(false);
  applySignatureToSelectedDocuments(signatureData);
};

const applySignatureToSelectedDocuments = async (signatureData) => {
  setLoading(true);
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const updatedDocuments = documents.map(doc => {
      if (selectedDocuments.has(doc._id)) {
        return { 
          ...doc, 
          signed: true,
          signature: signatureData,  // Oggetto completo
          signedAt: new Date().toISOString()
        };
      }
      return doc;
    });
    
    setDocuments(updatedDocuments);
    
    // Aggiorna folder status
    const updatedFolders = folders.map(folder => {
      const folderDocs = getDocumentsForFolder(folder._id);
      const allSigned = folderDocs.every(doc => 
        selectedDocuments.has(doc._id) || doc.signed
      );
      
      if (allSigned) {
        return { ...folder, status: 'signed' };
      }
      return folder;
    });
    
    setFolders(updatedFolders);
    
    // Salva in localStorage
    localStorage.setItem('mockDocuments', JSON.stringify(updatedDocuments));
    localStorage.setItem('mockFolders', JSON.stringify(updatedFolders));
    
    setSelectedDocuments(new Set());
    setLoading(false);
    
    toast.success(`Firma applicata a ${selectedDocuments.size} documenti`);
  } catch (error) {
    setLoading(false);
    toast.error('Errore durante l\'applicazione della firma');
  }
};
```

**Download ZIP:**
```javascript
const downloadSelectedAsZip = async () => {
  const selectedDocs = documents.filter(doc => 
    selectedDocuments.has(doc._id) && doc.signed
  );

  if (selectedDocs.length === 0) {
    toast.error('Nessun documento firmato selezionato');
    return;
  }

  setLoading(true);

  try {
    const zip = new JSZip();

    for (const doc of selectedDocs) {
      // Crea PDF per ogni documento
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Aggiungi ogni pagina
      for (let i = 0; i < doc.pages.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const pageImage = doc.pages[i];
        const imgProps = pdf.getImageProperties(pageImage);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(pageImage, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        // FIRMA E SIGILLO SULLA PRIMA PAGINA
        if (i === 0 && doc.signature?.image) {
          const signatureWidth = 30;
          const signatureHeight = 20;
          const pageWidth = 210;
          const pageHeight = 297;
          const margin = 10;
          const sealOffsetUp = 20;
          
          const sealY = pageHeight - signatureHeight - margin - sealOffsetUp;
          
          // 1. SIGILLO (se presente) - Margine sinistro, 20mm a destra
          if (doc.signature.seal) {
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont(undefined, 'bold');
            
            const sealX = margin + 10;
            let currentY = sealY;
            
            if (doc.signature.seal.transporterName) {
              pdf.text(doc.signature.seal.transporterName, sealX, currentY);
              currentY += 5;
            }
            
            if (doc.signature.seal.number) {
              pdf.text(`Sigillo: ${doc.signature.seal.number}`, sealX, currentY);
            }
          }
          
          // 2. FIRMA - Centro + 45mm destra, 1mm sopra sigillo
          const signatureCenterX = (pageWidth - signatureWidth) / 2;
          const signatureX = signatureCenterX + 45;
          const signatureY = sealY - 1;
          
          // Nome trasportatore a sinistra firma (grassetto)
          if (doc.signature.transporterName) {
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont(undefined, 'bold');
            
            const textX = signatureX - 5;
            const textY = signatureY + (signatureHeight / 2) + 2;
            
            pdf.text(doc.signature.transporterName, textX, textY, { align: 'right' });
          }
          
          // Immagine firma
          pdf.addImage(doc.signature.image, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
        }
      }

      // Nome file
      const pdfBlob = pdf.output('blob');
      const filename = doc.signature?.seal?.number
        ? `${doc.name}_sigillo_${doc.signature.seal.number}.pdf`
        : `${doc.name}_firmato.pdf`;
      
      zip.file(filename, pdfBlob);
    }

    // Genera e scarica ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const today = new Date().toISOString().split('T')[0];
    const zipFilename = `documenti_DDT_elaborati_${today}.zip`;
    
    const url = window.URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setLoading(false);
    toast.success(`Scaricati ${selectedDocs.length} documenti`);

  } catch (error) {
    console.error('Errore generazione ZIP:', error);
    setLoading(false);
    toast.error('Errore durante la generazione del file ZIP');
  }
};
```

**UI Visualizzazione Documento:**
```javascript
{folderDocuments.map(doc => (
  <div key={doc._id} className="document-item">
    <input
      type="checkbox"
      checked={selectedDocuments.has(doc._id)}
      onChange={(e) => handleDocumentSelect(doc._id, e.target.checked)}
    />
    <div className="document-name">
      <div>
        {doc.name} ({doc.pages.length} pag.)
      </div>
      {doc.signed && doc.signature && (
        <div style={{ fontSize: '0.8rem', color: '#059669' }}>
          ✓ Firmato da: {doc.signature.transporterName}
          {doc.signature.seal && doc.signature.seal.number && (
            <span style={{ marginLeft: '0.5rem', color: '#f59e0b' }}>
              🏷️ Sigillo: {doc.signature.seal.number}
            </span>
          )}
        </div>
      )}
    </div>
    {doc.signed && (
      <span style={{ color: '#059669', fontSize: '0.8rem' }}>
        ✓ Firmato
      </span>
    )}
  </div>
))}
```

---

### 8. SignatureModal.js (Sistema Firma Avanzato)

**Responsabilità:**
- Modale per applicazione firma
- Scelta tra trasportatore registrato e firma manuale
- Gestione sigillo opzionale
- Validazione e conferma

**Props:**
```javascript
{
  onClose: function(),              // Chiude modale
  onConfirm: function(signatureData), // Conferma firma
  transporters: []                  // Lista trasportatori
}
```

**Stati:**
```javascript
const [signatureType, setSignatureType] = useState('registered');
const [selectedTransporter, setSelectedTransporter] = useState('');
const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
const [manualSignature, setManualSignature] = useState(null);
const [sealNumber, setSealNumber] = useState('');
const [transporterNameForSeal, setTransporterNameForSeal] = useState('');
```

**Conferma Firma:**
```javascript
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
    signatureData.image = transporter.signature;
    signatureData.transporterName = transporter.name;
  } else {
    signatureData.image = manualSignature;
    signatureData.transporterName = 'Firma Manuale';
  }

  // Aggiungi sigillo se presente
  if (sealNumber.trim() || transporterNameForSeal.trim()) {
    signatureData.seal = {
      number: sealNumber.trim(),
      transporterName: transporterNameForSeal.trim() || signatureData.transporterName
    };
  }

  onConfirm(signatureData);
};
```

**UI Sezione 1 - Tipo Firma:**
```javascript
<div>
  <h3>1. Tipo Firma *</h3>
  
  <label>
    <input
      type="radio"
      value="registered"
      checked={signatureType === 'registered'}
      onChange={(e) => setSignatureType(e.target.value)}
    />
    <strong>Trasportatore Registrato</strong>
    <div>Usa firma da gestione trasportatori</div>
  </label>

  <label>
    <input
      type="radio"
      value="manual"
      checked={signatureType === 'manual'}
      onChange={(e) => setSignatureType(e.target.value)}
    />
    <strong>Firma Manuale</strong>
    <div>Disegna una nuova firma</div>
  </label>

  {signatureType === 'registered' && (
    <select
      value={selectedTransporter}
      onChange={(e) => setSelectedTransporter(e.target.value)}
    >
      <option value="">-- Seleziona trasportatore --</option>
      {transporters.map(t => (
        <option key={t.name} value={t.name}>{t.name}</option>
      ))}
    </select>
  )}

  {signatureType === 'manual' && (
    <>
      {manualSignature ? (
        <div>
          <img src={manualSignature} alt="Firma" />
          <button onClick={handleManualSignatureStart}>
            🔄 Ridisegna Firma
          </button>
        </div>
      ) : (
        <button onClick={handleManualSignatureStart}>
          ✍️ Disegna Firma Manuale
        </button>
      )}
    </>
  )}
</div>
```

**UI Sezione 2 - Sigillo Opzionale:**
```javascript
<div style={{ background: '#fef3c7' }}>
  <h3>2. Numero Sigillo (Opzionale)</h3>
  <p>Il sigillo apparirà sul margine sinistro, alla stessa altezza della firma</p>

  <input
    type="text"
    value={transporterNameForSeal}
    onChange={(e) => setTransporterNameForSeal(e.target.value)}
    placeholder="Es: Rossi Transport"
  />

  <input
    type="text"
    value={sealNumber}
    onChange={(e) => setSealNumber(e.target.value)}
    placeholder="Es: SL-12345"
  />

  {(transporterNameForSeal || sealNumber) && (
    <div>
      <strong>Anteprima sigillo:</strong>
      <div>
        {transporterNameForSeal || '(Nome trasportatore)'}
        {sealNumber && ` - Sigillo: ${sealNumber}`}
      </div>
    </div>
  )}
</div>
```

---

### 9. SignatureCanvas.js

**Responsabilità:**
- Canvas per disegno firma manuale
- Supporto mouse e touch
- Salva firma come base64

**Props:**
```javascript
{
  onSave: function(base64Image),  // Salva firma
  onCancel: function()            // Annulla
}
```

**Implementazione Canvas:**
```javascript
const SignatureCanvas = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Inizializza canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
  }, []);

  // Mouse events
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Save signature
  const saveSignature = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="signature-modal">
      <div className="signature-container">
        <h2>Inserisci la tua firma</h2>
        
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={(e) => startDrawing(e.touches[0])}
          onTouchMove={(e) => draw(e.touches[0])}
          onTouchEnd={stopDrawing}
          style={{ border: '2px solid #ccc', cursor: 'crosshair' }}
        />

        <div>
          <button onClick={clearCanvas}>🗑️ Cancella</button>
          <button onClick={saveSignature}>✅ Salva Firma</button>
          <button onClick={onCancel}>❌ Annulla</button>
        </div>
      </div>
    </div>
  );
};
```

---

### 10. TransporterManager.js

**Responsabilità:**
- Lista trasportatori registrati
- Aggiungi nuovo trasportatore
- Disegna firma per trasportatore
- Elimina trasportatore

**Props:**
```javascript
{
  transporters: [],                    // Lista trasportatori
  setTransporters: function(array),    // Aggiorna lista
  onClose: function()                  // Chiude modale
}
```

**Stati:**
```javascript
const [showAddForm, setShowAddForm] = useState(false);
const [newTransporter, setNewTransporter] = useState({ name: '', company: '' });
const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
const [tempSignature, setTempSignature] = useState(null);
```

**Aggiungi Trasportatore:**
```javascript
const handleAddTransporter = () => {
  if (!newTransporter.name || !newTransporter.company) {
    toast.error('Compila tutti i campi');
    return;
  }

  setShowSignatureCanvas(true);
};

const handleSignatureSave = (signatureData) => {
  const transporter = {
    id: `trans_${Date.now()}`,
    name: newTransporter.name,
    company: newTransporter.company,
    signature: signatureData,
    createdAt: new Date().toISOString()
  };

  const updatedTransporters = [...transporters, transporter];
  setTransporters(updatedTransporters);
  
  // Salva in localStorage
  localStorage.setItem('transporters', JSON.stringify(updatedTransporters));

  toast.success('Trasportatore aggiunto con successo');
  
  // Reset
  setNewTransporter({ name: '', company: '' });
  setShowAddForm(false);
  setShowSignatureCanvas(false);
};
```

**Elimina Trasportatore:**
```javascript
const handleDeleteTransporter = (transporterId) => {
  if (window.confirm('Vuoi eliminare questo trasportatore?')) {
    const updatedTransporters = transporters.filter(t => t.id !== transporterId);
    setTransporters(updatedTransporters);
    localStorage.setItem('transporters', JSON.stringify(updatedTransporters));
    toast.success('Trasportatore eliminato');
  }
};
```

---

## 🔐 SISTEMA DI FIRMA E SIGILLO

### Struttura Dati Firma
```javascript
signature: {
  type: 'registered' | 'manual',    // Tipo firma
  image: string (base64 PNG),       // Immagine firma
  transporterName: string,          // Nome trasportatore
  seal: {                           // OPZIONALE
    transporterName: string,        // Nome per sigillo
    number: string                  // Numero sigillo
  }
}
```

### Workflow Firma Completo

1. **Selezione Documenti**
   - Utente seleziona 1+ documenti NON firmati
   - Click "✍️ Applica Firma Unica"

2. **Modale Firma**
   - Apre `SignatureModal`
   - Scelta tipo firma:
     - Trasportatore registrato → dropdown + preview
     - Firma manuale → canvas disegno

3. **Sigillo Opzionale**
   - Campi: Nome Trasportatore + N° Sigillo
   - Anteprima in tempo reale
   - Permette salvataggio senza sigillo

4. **Validazione**
   - Firma obbligatoria (registered o manual)
   - Sigillo opzionale
   - Toast error se validazione fallisce

5. **Applicazione**
   - Crea oggetto `signatureData`
   - Aggiorna documenti selezionati:
     ```javascript
     {
       ...doc,
       signed: true,
       signature: signatureData,
       signedAt: timestamp
     }
     ```
   - Aggiorna folder.status se tutti firmati
   - Salva in localStorage
   - Sposta documenti da "In Attesa" a "Firmati"

### Posizionamento nel PDF

**Parametri Layout:**
```javascript
const signatureWidth = 30;      // mm
const signatureHeight = 20;     // mm
const pageWidth = 210;          // A4 width
const pageHeight = 297;         // A4 height
const margin = 10;              // mm
const sealOffsetUp = 20;        // mm dal fondo
```

**Sigillo (se presente):**
```
Posizione X: margin + 10 = 20mm (da sinistra)
Posizione Y: pageHeight - signatureHeight - margin - sealOffsetUp = 267mm
Font: 9pt grassetto
Elementi:
  - Nome trasportatore (grassetto)
  - "Sigillo: [numero]" (grassetto)
```

**Firma:**
```
Posizione X: ((pageWidth - signatureWidth) / 2) + 45 = ~135mm (centro+45mm destra)
Posizione Y: sealY - 1 = 266mm (1mm sopra sigillo)
Dimensioni: 30mm x 20mm
```

**Nome Trasportatore (accanto firma):**
```
Posizione X: signatureX - 5 (5mm a sinistra firma, align: right)
Posizione Y: signatureY + (signatureHeight / 2) + 2 (centrato verticalmente)
Font: 9pt grassetto
```

**Esempio Layout:**
```
┌───────────────────────────────────┐
│                                   │
│      [Contenuto documento]        │
│                                   │
│                                   │
│     SIGILLO (20mm sx)             │ ← Y: 267mm (20mm dal fondo)
│     Trasporti Rossi               │
│     Sigillo: TR-001               │
│                  Mario [FIRMA]    │ ← Y: 266mm (1mm sopra)
│                       ↑           │
│                  (centro+45mm)    │
└───────────────────────────────────┘
```

---

## 📤 SISTEMA DI EXPORT PDF/ZIP

### Generazione PDF con jsPDF

**Libreria:** `jsPDF`

**Processo:**
```javascript
1. Per ogni documento selezionato:
   a. Crea nuovo PDF (A4 portrait)
   b. Per ogni pagina documento:
      - Aggiungi immagine base64
      - Scala per fit A4
      - Se prima pagina E firmato:
        * Aggiungi sigillo (se presente)
        * Aggiungi firma
        * Aggiungi nome trasportatore
   c. Output PDF come Blob
   d. Aggiungi a ZIP

2. Genera ZIP con JSZip
3. Download automatico browser
```

**Codice Generazione PDF Pagina:**
```javascript
for (let i = 0; i < doc.pages.length; i++) {
  if (i > 0) {
    pdf.addPage();
  }

  const pageImage = doc.pages[i];
  const imgProps = pdf.getImageProperties(pageImage);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(pageImage, 'JPEG', 0, 0, pdfWidth, pdfHeight);

  // Solo prima pagina: firma e sigillo
  if (i === 0 && doc.signature?.image) {
    // ... codice firma e sigillo ...
  }
}
```

**Codice Firma nel PDF:**
```javascript
if (i === 0 && doc.signature?.image) {
  const signatureWidth = 30;
  const signatureHeight = 20;
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const sealOffsetUp = 20;
  
  const sealY = pageHeight - signatureHeight - margin - sealOffsetUp;
  
  // SIGILLO
  if (doc.signature.seal) {
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    
    const sealX = margin + 10;
    let currentY = sealY;
    
    if (doc.signature.seal.transporterName) {
      pdf.text(doc.signature.seal.transporterName, sealX, currentY);
      currentY += 5;
    }
    
    if (doc.signature.seal.number) {
      pdf.text(`Sigillo: ${doc.signature.seal.number}`, sealX, currentY);
    }
  }
  
  // FIRMA
  const signatureCenterX = (pageWidth - signatureWidth) / 2;
  const signatureX = signatureCenterX + 45;
  const signatureY = sealY - 1;
  
  // Nome trasportatore
  if (doc.signature.transporterName) {
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    
    const textX = signatureX - 5;
    const textY = signatureY + (signatureHeight / 2) + 2;
    
    pdf.text(doc.signature.transporterName, textX, textY, { align: 'right' });
  }
  
  // Immagine firma
  pdf.addImage(doc.signature.image, 'PNG', signatureX, signatureY, signatureWidth, signatureHeight);
}
```

### Creazione ZIP con JSZip

**Libreria:** `JSZip`

**Processo:**
```javascript
const zip = new JSZip();

// Aggiungi PDF al ZIP
for (const doc of selectedDocs) {
  const pdf = generatePDF(doc);  // vedi sopra
  const pdfBlob = pdf.output('blob');
  
  // Nome file
  const filename = doc.signature?.seal?.number
    ? `${doc.name}_sigillo_${doc.signature.seal.number}.pdf`
    : `${doc.name}_firmato.pdf`;
  
  zip.file(filename, pdfBlob);
}

// Genera ZIP
const zipBlob = await zip.generateAsync({ type: 'blob' });

// Download
const today = new Date().toISOString().split('T')[0];
const zipFilename = `documenti_DDT_elaborati_${today}.zip`;

const url = window.URL.createObjectURL(zipBlob);
const link = document.createElement('a');
link.href = url;
link.download = zipFilename;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
window.URL.revokeObjectURL(url);
```

**Esempio Nomi File:**
```
documenti_DDT_elaborati_2025-01-20.zip
  ├── Documento_001_Danesi_firmato.pdf
  ├── Documento_002_Danesi_sigillo_TR-2025-001.pdf
  └── Documento_003_Happening_firmato.pdf
```

---

## 💿 GESTIONE STATO E PERSISTENZA

### localStorage Keys

```javascript
// Dati applicazione
'mockFolders'        // Array di folders
'mockDocuments'      // Array di documents
'transporters'       // Array di transporters

// Esempio lettura
const folders = JSON.parse(localStorage.getItem('mockFolders') || '[]');

// Esempio scrittura
localStorage.setItem('mockFolders', JSON.stringify(updatedFolders));
```

### Inizializzazione Dati Mock

**File:** `utils/mockData.js`

**Funzione:** `initializeMockData()`
```javascript
export const initializeMockData = (setFolders, setDocuments, setTransporters) => {
  // Controlla se dati esistenti
  const existingFolders = JSON.parse(localStorage.getItem('mockFolders') || '[]');
  
  if (existingFolders.length === 0) {
    // Inizializza con dati mock
    localStorage.setItem('mockFolders', JSON.stringify(mockData.folders));
    localStorage.setItem('mockDocuments', JSON.stringify(mockData.documents));
    localStorage.setItem('transporters', JSON.stringify(mockData.transporters));
    
    setFolders(mockData.folders);
    setDocuments(mockData.documents);
    if (setTransporters) setTransporters(mockData.transporters);
    
    return true; // Nuovi dati
  } else {
    // Usa dati esistenti
    setFolders(existingFolders);
    setDocuments(existingDocuments);
    if (setTransporters) setTransporters(existingTransporters);
    
    return false; // Dati esistenti
  }
};
```

**Chiamata in App.js:**
```javascript
useEffect(() => {
  initializeMockData(setFolders, setDocuments);
}, []);
```

### Reset Dati Mock

**Funzione:** `resetMockData()`
```javascript
export const resetMockData = (setFolders, setDocuments, setTransporters) => {
  // Rimuovi dati esistenti
  localStorage.removeItem('mockFolders');
  localStorage.removeItem('mockDocuments');
  localStorage.removeItem('transporters');
  
  // Reinizializza
  return initializeMockData(setFolders, setDocuments, setTransporters);
};
```

**Uso nel Dashboard:**
```javascript
const handleLoadMockData = () => {
  resetMockData(setFolders, setDocuments, setTransporters);
  toast.success('Dati mock caricati');
};
```

### Context Globale (AppContext)

**Definizione in App.js:**
```javascript
const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
```

**Provider:**
```javascript
const contextValue = {
  user,           // { username, role }
  setUser,
  currentFolder,  // Folder selezionato
  setCurrentFolder,
  currentDocument,// Documento in costruzione
  setCurrentDocument,
  folders,        // Array folders
  setFolders,
  documents,      // Array documents
  setDocuments
};

<AppContext.Provider value={contextValue}>
  {children}
</AppContext.Provider>
```

**Uso nei Componenti:**
```javascript
import { useAppContext } from '../App';

const MyComponent = () => {
  const { 
    user, 
    folders, 
    documents, 
    setDocuments,
    currentFolder 
  } = useAppContext();
  
  // Usa gli stati...
};
```

### Salvataggio Automatico

**Documenti Firmati:**
```javascript
// Dopo firma
const updatedDocuments = documents.map(/* ... */);
setDocuments(updatedDocuments);
localStorage.setItem('mockDocuments', JSON.stringify(updatedDocuments));
```

**Folders Aggiornati:**
```javascript
// Dopo firma tutti documenti
const updatedFolders = folders.map(/* ... */);
setFolders(updatedFolders);
localStorage.setItem('mockFolders', JSON.stringify(updatedFolders));
```

**Trasportatori:**
```javascript
// Dopo aggiungi/elimina
const updatedTransporters = [...transporters, newTransporter];
setTransporters(updatedTransporters);
localStorage.setItem('transporters', JSON.stringify(updatedTransporters));
```

---

## 🔧 CONFIGURAZIONE TECNICA

### Dipendenze Principali (package.json)

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "jspdf": "^2.x",              // Generazione PDF
    "jszip": "^3.x",              // Creazione ZIP
    "sonner": "^1.x",             // Toast notifications
    "@radix-ui/react-*": "^1.x"  // Shadcn UI components
  }
}
```

### File OpenCV.js

**Posizione:** `/app/frontend/public/opencv.js`
**Dimensione:** ~11MB
**Versione:** 4.x
**Source:** https://docs.opencv.org/4.x/opencv.js

**Caricamento:**
- File locale servito da `/public`
- Gestito da `OpenCVContext.js`
- Singleton pattern garantisce caricamento unico

### Struttura CSS

**File Principali:**
- `App.css` - Stili globali applicazione
- `index.css` - Stili base e reset
- Tailwind CSS configurato ma poco usato
- Stili inline nei componenti per layout specifici

**Classi Principali:**
```css
.dashboard-container
.folder-card
.document-item
.signature-modal
.signature-container
.btn-save, .btn-secondary, .btn-clear
.loading-spinner
.document-checkbox
.action-bar
```

---

## 📊 FLUSSO DATI COMPLETO

### OPERATORE → CARICO MERCI

```
1. OPERATORE LOGIN
   ↓
2. Dashboard Operatore
   - Visualizza folders (terzisti)
   ↓
3. Seleziona Terzista
   - setCurrentFolder(folder)
   - navigate('/scanner')
   ↓
4. Scanner Fotocamera
   - Cattura foto 1
   - Apre DocumentScanner
   - Selezione manuale 4 angoli
   - Elaborazione OpenCV
   - "Pagina Successiva"
   ↓
   - Cattura foto 2
   - Elaborazione
   - "Pagina Successiva"
   ↓
   - Cattura foto 3
   - Elaborazione
   - "Concludi e Invia"
   ↓
5. Anteprima Finale
   - Mostra griglia 3 pagine
   - "Conferma e Salva"
   ↓
6. Salvataggio Documento
   - Crea oggetto documento
   - signed: false
   - pages: [img1, img2, img3]
   - Aggiunge a documents array
   - Salva localStorage
   - navigate('/operator')

---

7. CARICO MERCI LOGIN
   ↓
8. Dashboard Carico Merci
   - Tab "In Attesa"
   - Folder Danesi (status: pending)
   - Documento_xxx (3 pag.) NON firmato
   ↓
9. Selezione Documento
   - Checkbox documento
   - Action bar appare
   - "✍️ Applica Firma Unica"
   ↓
10. Modale Firma
    - Radio: "Firma Manuale"
    - Disegna firma
    - Salva firma
    - Compila Sigillo:
      * Nome: "Trasporti Rossi"
      * Numero: "TR-2025-001"
    - "Applica Firma"
    ↓
11. Aggiornamento Documento
    - signed: true
    - signature: {
        type: 'manual',
        image: base64,
        transporterName: 'Firma Manuale',
        seal: {
          transporterName: 'Trasporti Rossi',
          number: 'TR-2025-001'
        }
      }
    - signedAt: timestamp
    - Salva localStorage
    ↓
12. Documento Spostato
    - Da "In Attesa" → "Firmati"
    - Visualizza:
      "✓ Firmato da: Firma Manuale"
      "🏷️ Sigillo: TR-2025-001" (arancione)
    ↓
13. Download ZIP
    - Seleziona documento firmato
    - "⬇️ Scarica ZIP"
    - Genera PDF con firma e sigillo
    - Crea ZIP
    - Download: documenti_DDT_elaborati_2025-01-20.zip
```

---

## 🛠️ COMANDI UTILI

### Avvio Applicazione
```bash
cd /app/frontend
yarn start  # Porta 3000
```

### Restart Servizi
```bash
sudo supervisorctl restart frontend
sudo supervisorctl restart all
```

### Log Frontend
```bash
tail -f /var/log/supervisor/frontend.out.log
tail -f /var/log/supervisor/frontend.err.log
```

### Reset Dati Mock
```javascript
// Nella dashboard carico merci
Click "Carica Dati Test"
// Oppure console browser
localStorage.clear();
location.reload();
```

---

## 🐛 DEBUG E TROUBLESHOOTING

### OpenCV.js Non Carica

**Sintomi:**
- Spinner infinito "Caricamento OpenCV"
- Error: "Impossibile caricare OpenCV.js"

**Soluzioni:**
1. Verifica file esiste: `/app/frontend/public/opencv.js` (11MB)
2. Check console browser per errori 404
3. Verifica `OpenCVContext.js` usa `/opencv.js` (non CDN)
4. Controlla network tab: deve caricare da localhost:3000/opencv.js

### BindingError OpenCV

**Sintomo:**
```
BindingError: Cannot register public name 'IntVector' twice
```

**Causa:** OpenCV caricato più volte

**Soluzione:** Implementato con `OpenCVContext.js` singleton

### Documenti Non Appaiono in "In Attesa"

**Causa:** `signed: true` erroneamente settato

**Soluzione:**
- Verifica `confirmAndSave()` in `CameraScanner.js`
- Deve settare `signed: false`
- Check localStorage: `mockDocuments`

### Firma Non Appare nel PDF

**Causa:** Posizionamento fuori pagina o mancante

**Debug:**
```javascript
console.log('Firma Y:', signatureY);
console.log('Page height:', pageHeight);
// signatureY deve essere < pageHeight
```

### ZIP Download Fallisce

**Causa:** jsPDF o JSZip errore

**Debug:**
```javascript
try {
  const pdf = new jsPDF(/* ... */);
  // ...
} catch (error) {
  console.error('PDF Error:', error);
}
```

---

## 📝 NOTE TECNICHE

### Immagini Base64
- Tutte le immagini salvate come base64
- Format: `data:image/jpeg;base64,...` o `data:image/png;base64,...`
- Pro: Facile storage localStorage
- Contro: Dimensioni grandi (1 pagina A4 ~200-500KB)

### Limitazioni localStorage
- Max 5-10MB per dominio
- ~10-20 documenti multipagina
- Produzione richiede backend reale

### Performance OpenCV.js
- Prima elaborazione: ~2-3 secondi
- Successive: ~1-2 secondi
- Dipende da dimensione immagine input

### Browser Compatibility
- Chrome/Edge: ✅ Pieno supporto
- Safari: ✅ Supporto (iOS camera richiede HTTPS)
- Firefox: ✅ Supporto
- IE: ❌ Non supportato

---

## 🎯 RIEPILOGO FUNZIONALITÀ

### ✅ Implementate e Funzionanti

**OPERATORE:**
- [x] Login con credenziali
- [x] Dashboard con lista terzisti
- [x] Scanner fotocamera/upload
- [x] Workflow multipagina
- [x] Selezione manuale 4 angoli (SEMPRE)
- [x] Elaborazione OpenCV + correzione prospettica
- [x] Anteprima finale multipagina
- [x] Salvataggio documenti (signed: false)

**CARICO MERCI:**
- [x] Login con credenziali
- [x] Dashboard con tab "In Attesa"/"Firmati"
- [x] Filtri: terzista, data
- [x] Selezione multipla documenti
- [x] Gestione trasportatori (aggiungi/elimina)
- [x] Modale firma avanzato
- [x] Firma trasportatore registrato
- [x] Firma manuale con canvas
- [x] Sigillo opzionale
- [x] Applicazione firma a documenti
- [x] Visualizzazione firma + sigillo nella lista
- [x] Download ZIP con PDF firmati
- [x] Posizionamento firma e sigillo nel PDF

**SISTEMA:**
- [x] OpenCV.js singleton (no BindingError)
- [x] Persistenza localStorage
- [x] Toast notifications
- [x] Routing protetto per ruoli
- [x] Dati mock con reset

### ❌ Non Implementate (Fuori Scope)

- [ ] Backend reale (FastAPI + MongoDB)
- [ ] Autenticazione JWT
- [ ] Upload real-time su server
- [ ] Rilevamento automatico bordi OpenCV
- [ ] Multi-utente concorrente
- [ ] Export Excel/CSV
- [ ] Email notifiche
- [ ] Firma digitale certificata
- [ ] Backup automatico cloud

---

**Fine Documentazione**

Versione: 1.0  
Data: 2025-01-20  
Autore: AI Agent (documentazione generata da analisi codice)
