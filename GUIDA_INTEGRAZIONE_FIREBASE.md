# 🔥 GUIDA INTEGRAZIONE FIREBASE - Applicazione React

## ✅ STATO ATTUALE

Firebase è già configurato e pronto all'uso:
- ✅ Firebase SDK installato (`firebase@12.3.0`)
- ✅ Configurazione in `/src/lib/firebase.js`
- ✅ Helper functions in `/src/lib/firebaseHelpers.js`

---

## 📚 FUNZIONI DISPONIBILI

### Documenti
```javascript
import { 
  salvaDocumento,           // Salva nuovo documento
  leggiDocumenti,           // Leggi tutti i documenti
  leggiDocumentiPerFolder,  // Leggi documenti per cartella
  aggiornaDocumento,        // Aggiorna documento esistente
  firmaDocumento,           // Applica firma a documento
  eliminaDocumento          // Elimina documento
} from './lib/firebaseHelpers';
```

### Folders
```javascript
import { 
  salvaFolder,      // Salva nuovo folder
  leggiFolders,     // Leggi tutti i folders
  aggiornaFolder    // Aggiorna folder esistente
} from './lib/firebaseHelpers';
```

### Trasportatori
```javascript
import { 
  salvaTrasportatore,     // Salva nuovo trasportatore
  leggiTrasportatori,     // Leggi tutti i trasportatori
  eliminaTrasportatore    // Elimina trasportatore
} from './lib/firebaseHelpers';
```

### Utility
```javascript
import { 
  sincronizzaLocalStorageConFirebase  // Migra dati localStorage → Firebase
} from './lib/firebaseHelpers';
```

---

## 🔧 INTEGRAZIONE NEL CODICE ESISTENTE

### 1️⃣ CameraScanner.js - Salva Documento su Firebase

**PRIMA (localStorage):**
```javascript
const confirmAndSave = () => {
  const finalDocument = {
    _id: Date.now().toString(),
    folderId: currentFolder._id,
    name: `Documento_${Date.now()}`,
    pages: processedPages,
    signed: false,
    signature: null,
    processedByOperator: true,
    createdAt: new Date().toISOString()
  };
  
  // Salva localStorage
  setDocuments(prev => [...prev, finalDocument]);
  localStorage.setItem('mockDocuments', JSON.stringify([...documents, finalDocument]));
  
  toast.success(`Documento con ${processedPages.length} pagine salvato!`);
  navigate('/operator');
};
```

**DOPO (Firebase):**
```javascript
import { salvaDocumento } from '../lib/firebaseHelpers';

const confirmAndSave = async () => {
  try {
    setLoading(true);
    
    const finalDocument = {
      folderId: currentFolder._id,
      name: `Documento_${Date.now()}`,
      pages: processedPages,
      signed: false,
      signature: null,
      processedByOperator: true,
      createdAt: new Date().toISOString()
    };
    
    // Salva su Firebase
    const docId = await salvaDocumento(finalDocument);
    
    // Aggiorna state locale (opzionale)
    setDocuments(prev => [...prev, { ...finalDocument, _id: docId }]);
    
    toast.success(`Documento salvato su cloud!`);
    
    // Cleanup e navigazione
    stopCamera();
    setProcessedPages([]);
    setShowPreview(false);
    navigate('/operator');
    
  } catch (error) {
    console.error('Errore salvataggio:', error);
    toast.error('Errore durante il salvataggio su cloud');
  } finally {
    setLoading(false);
  }
};
```

---

### 2️⃣ CargoManagerDashboard.js - Carica Documenti da Firebase

**PRIMA (localStorage):**
```javascript
useEffect(() => {
  const savedDocuments = JSON.parse(localStorage.getItem('mockDocuments') || '[]');
  setDocuments(savedDocuments);
}, []);
```

**DOPO (Firebase):**
```javascript
import { leggiDocumenti, leggiFolders } from '../lib/firebaseHelpers';

useEffect(() => {
  const caricaDatiFirebase = async () => {
    try {
      setLoading(true);
      
      // Carica da Firebase
      const [documentiFirebase, foldersFirebase] = await Promise.all([
        leggiDocumenti(),
        leggiFolders()
      ]);
      
      setDocuments(documentiFirebase);
      setFolders(foldersFirebase);
      
      console.log('✅ Dati caricati da Firebase');
      
    } catch (error) {
      console.error('❌ Errore caricamento Firebase:', error);
      toast.error('Errore caricamento dati da cloud');
    } finally {
      setLoading(false);
    }
  };
  
  caricaDatiFirebase();
}, []);
```

---

### 3️⃣ CargoManagerDashboard.js - Applica Firma su Firebase

**PRIMA (localStorage):**
```javascript
const applySignatureToSelectedDocuments = async (signatureData) => {
  setLoading(true);
  
  const updatedDocuments = documents.map(doc => {
    if (selectedDocuments.has(doc._id)) {
      return { 
        ...doc, 
        signed: true,
        signature: signatureData,
        signedAt: new Date().toISOString()
      };
    }
    return doc;
  });
  
  setDocuments(updatedDocuments);
  localStorage.setItem('mockDocuments', JSON.stringify(updatedDocuments));
  
  toast.success('Firma applicata');
  setLoading(false);
};
```

**DOPO (Firebase):**
```javascript
import { firmaDocumento } from '../lib/firebaseHelpers';

const applySignatureToSelectedDocuments = async (signatureData) => {
  setLoading(true);
  
  try {
    // Firma ogni documento selezionato su Firebase
    const firmaPromises = Array.from(selectedDocuments).map(docId =>
      firmaDocumento(docId, signatureData)
    );
    
    await Promise.all(firmaPromises);
    
    // Ricarica documenti da Firebase
    const documentiAggiornati = await leggiDocumenti();
    setDocuments(documentiAggiornati);
    
    // Aggiorna folders se necessario
    const updatedFolders = await leggiFolders();
    setFolders(updatedFolders);
    
    setSelectedDocuments(new Set());
    toast.success(`Firma applicata a ${firmaPromises.length} documenti`);
    
  } catch (error) {
    console.error('❌ Errore applicazione firma:', error);
    toast.error('Errore durante la firma dei documenti');
  } finally {
    setLoading(false);
  }
};
```

---

### 4️⃣ TransporterManager.js - Gestione Trasportatori

**PRIMA (localStorage):**
```javascript
const handleAddTransporter = () => {
  const transporter = {
    id: `trans_${Date.now()}`,
    name: newTransporter.name,
    company: newTransporter.company,
    signature: signatureData,
    createdAt: new Date().toISOString()
  };

  const updatedTransporters = [...transporters, transporter];
  setTransporters(updatedTransporters);
  localStorage.setItem('transporters', JSON.stringify(updatedTransporters));
};
```

**DOPO (Firebase):**
```javascript
import { salvaTrasportatore, leggiTrasportatori } from '../lib/firebaseHelpers';

const handleAddTransporter = async () => {
  try {
    const transporter = {
      name: newTransporter.name,
      company: newTransporter.company,
      signature: signatureData,
      createdAt: new Date().toISOString()
    };

    // Salva su Firebase
    const transporterId = await salvaTrasportatore(transporter);
    
    // Ricarica trasportatori
    const trasportatoriAggiornati = await leggiTrasportatori();
    setTransporters(trasportatoriAggiornati);
    
    toast.success('Trasportatore salvato su cloud');
    
  } catch (error) {
    console.error('Errore salvataggio trasportatore:', error);
    toast.error('Errore durante il salvataggio');
  }
};
```

---

## 🔄 MIGRAZIONE DA localStorage A FIREBASE

### Opzione 1: Migrazione Manuale (One-Time)

Aggiungi un pulsante temporaneo nella dashboard:

```javascript
import { sincronizzaLocalStorageConFirebase } from '../lib/firebaseHelpers';

const handleMigrateToFirebase = async () => {
  if (!window.confirm('Migrare tutti i dati da localStorage a Firebase?')) {
    return;
  }
  
  try {
    setLoading(true);
    
    const stats = await sincronizzaLocalStorageConFirebase();
    
    toast.success(`Migrazione completata! 
      ${stats.folders} folders, 
      ${stats.documents} documenti, 
      ${stats.transporters} trasportatori`);
    
    // Ricarica dati da Firebase
    const [docs, folds, trans] = await Promise.all([
      leggiDocumenti(),
      leggiFolders(),
      leggiTrasportatori()
    ]);
    
    setDocuments(docs);
    setFolders(folds);
    setTransporters(trans);
    
  } catch (error) {
    console.error('Errore migrazione:', error);
    toast.error('Errore durante la migrazione');
  } finally {
    setLoading(false);
  }
};

// Nel JSX
<button onClick={handleMigrateToFirebase}>
  🔄 Migra a Firebase
</button>
```

### Opzione 2: Modalità Ibrida (Transizione Graduale)

Usa sia localStorage che Firebase in parallelo:

```javascript
const confirmAndSave = async () => {
  const finalDocument = { /* ... */ };
  
  try {
    // Salva su Firebase
    const docId = await salvaDocumento(finalDocument);
    
    // Fallback localStorage (per sicurezza durante transizione)
    const docWithId = { ...finalDocument, _id: docId };
    const localDocs = JSON.parse(localStorage.getItem('mockDocuments') || '[]');
    localStorage.setItem('mockDocuments', JSON.stringify([...localDocs, docWithId]));
    
    toast.success('Salvato su cloud e locale');
  } catch (error) {
    // Se Firebase fallisce, usa solo localStorage
    console.error('Firebase failed, using localStorage:', error);
    localStorage.setItem('mockDocuments', JSON.stringify([...documents, finalDocument]));
    toast.warning('Salvato solo localmente');
  }
};
```

---

## 🎯 PIANO DI IMPLEMENTAZIONE CONSIGLIATO

### FASE 1: Test Locale (1 giorno)
1. ✅ Firebase configurato
2. ✅ Helper functions create
3. Test funzioni in console browser:
   ```javascript
   import { salvaDocumento } from './lib/firebaseHelpers';
   salvaDocumento({ name: 'test', pages: [] }).then(console.log);
   ```

### FASE 2: Migrazione Lettura (2 giorni)
1. Modificare `CargoManagerDashboard.js` per leggere da Firebase
2. Modificare `OperatorDashboard.js` per leggere folders da Firebase
3. Testare visualizzazione dati

### FASE 3: Migrazione Scrittura (3 giorni)
1. Modificare `CameraScanner.js` per salvare su Firebase
2. Modificare `CargoManagerDashboard.js` per firma su Firebase
3. Modificare `TransporterManager.js` per CRUD trasportatori

### FASE 4: Pulizia (1 giorno)
1. Rimuovere tutti i `localStorage.setItem()` e `localStorage.getItem()`
2. Aggiungere pulsante "Svuota Cache Locale" se necessario
3. Test completo end-to-end

---

## 🔍 DEBUG E TESTING

### Console Browser
```javascript
// Test salvataggio
window.salvaDocumento({ name: 'Test', pages: [], signed: false })
  .then(id => console.log('Salvato:', id));

// Test lettura
window.leggiDocumenti()
  .then(docs => console.log('Documenti:', docs));

// Test migrazione
window.sincronizzaLocalStorageConFirebase()
  .then(stats => console.log('Migrati:', stats));
```

### Firebase Console
1. Vai su: https://console.firebase.google.com/
2. Seleziona progetto: `ddt-logistica`
3. Menu: Firestore Database
4. Verifica collezioni:
   - `documents`
   - `folders`
   - `transporters`

---

## ⚠️ NOTE IMPORTANTI

### Dimensione Documenti
- Firebase Firestore: **limite 1MB per documento**
- Le pagine base64 possono essere ~200-500KB ciascuna
- **Soluzione**: 
  1. Salva solo riferimenti
  2. Usa Firebase Storage per immagini grandi
  3. Comprimi immagini prima del salvataggio

### Esempio Storage per Immagini:
```javascript
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

const storage = getStorage();

// Upload immagine
const uploadPage = async (pageBase64, docId, pageIndex) => {
  const storageRef = ref(storage, `documents/${docId}/page_${pageIndex}.jpg`);
  await uploadString(storageRef, pageBase64, 'data_url');
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
};

// Nel documento salva solo URL
const finalDocument = {
  name: 'Doc001',
  pages: [
    'https://firebasestorage.googleapis.com/...',
    'https://firebasestorage.googleapis.com/...'
  ]
};
```

### Regole Firestore (Security)
Vai su Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permetti lettura/scrittura per testing
    match /{document=**} {
      allow read, write: if true;
    }
    
    // Produzione: aggiungi autenticazione
    // match /documents/{docId} {
    //   allow read: if request.auth != null;
    //   allow write: if request.auth != null;
    // }
  }
}
```

---

## 🚀 PROSSIMI PASSI

1. **Immediato**: Testare helper functions in console
2. **Breve termine**: Implementare lettura da Firebase
3. **Medio termine**: Migrare scrittura a Firebase
4. **Lungo termine**: Rimuovere completamente localStorage

**Vuoi che proceda con l'integrazione in uno dei componenti specifici?**
