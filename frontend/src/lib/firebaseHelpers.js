// src/lib/firebaseHelpers.js
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';

/**
 * FIREBASE HELPERS - Funzioni utility per operazioni Firestore
 * Sostituiscono completamente localStorage con database cloud
 */

// ==================== DOCUMENTI ====================

/**
 * Salva un documento su Firestore
 * @param {Object} documento - Oggetto documento da salvare
 * @returns {Promise<string>} - ID del documento salvato
 */
export const salvaDocumento = async (documento) => {
  try {
    const docData = {
      ...documento,
      createdAt: documento.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'documents'), docData);
    console.log("✅ Documento salvato su Firebase con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Errore salvataggio documento:", error);
    throw error;
  }
};

/**
 * Leggi tutti i documenti da Firestore
 * @returns {Promise<Array>} - Array di documenti
 */
export const leggiDocumenti = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'documents'));
    const documenti = querySnapshot.docs.map(doc => ({
      id: doc.id,
      _id: doc.id, // Mantiene compatibilità con codice esistente
      ...doc.data()
    }));
    
    console.log(`✅ Letti ${documenti.length} documenti da Firebase`);
    return documenti;
  } catch (error) {
    console.error("❌ Errore lettura documenti:", error);
    throw error;
  }
};

/**
 * Leggi documenti filtrati per folder
 * @param {string} folderId - ID della cartella
 * @returns {Promise<Array>} - Array di documenti del folder
 */
export const leggiDocumentiPerFolder = async (folderId) => {
  try {
    const q = query(
      collection(db, 'documents'),
      where('folderId', '==', folderId)
    );
    const querySnapshot = await getDocs(q);
    const documenti = querySnapshot.docs.map(doc => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data()
    }));
    
    return documenti;
  } catch (error) {
    console.error("❌ Errore lettura documenti per folder:", error);
    throw error;
  }
};

/**
 * Aggiorna un documento esistente
 * @param {string} docId - ID del documento
 * @param {Object} updates - Campi da aggiornare
 */
export const aggiornaDocumento = async (docId, updates) => {
  try {
    const docRef = doc(db, 'documents', docId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    console.log("✅ Documento aggiornato:", docId);
  } catch (error) {
    console.error("❌ Errore aggiornamento documento:", error);
    throw error;
  }
};

/**
 * Applica firma a un documento
 * @param {string} docId - ID del documento
 * @param {Object} signatureData - Dati firma
 */
export const firmaDocumento = async (docId, signatureData) => {
  try {
    const docRef = doc(db, 'documents', docId);
    await updateDoc(docRef, {
      signed: true,
      signature: signatureData,
      signedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log("✅ Documento firmato:", docId);
  } catch (error) {
    console.error("❌ Errore firma documento:", error);
    throw error;
  }
};

/**
 * Elimina un documento
 * @param {string} docId - ID del documento
 */
export const eliminaDocumento = async (docId) => {
  try {
    await deleteDoc(doc(db, 'documents', docId));
    console.log("✅ Documento eliminato:", docId);
  } catch (error) {
    console.error("❌ Errore eliminazione documento:", error);
    throw error;
  }
};

// ==================== FOLDERS ====================

/**
 * Salva un folder su Firestore
 * @param {Object} folder - Oggetto folder da salvare
 * @returns {Promise<string>} - ID del folder salvato
 */
export const salvaFolder = async (folder) => {
  try {
    const folderData = {
      ...folder,
      createdAt: folder.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'folders'), folderData);
    console.log("✅ Folder salvato su Firebase con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Errore salvataggio folder:", error);
    throw error;
  }
};

/**
 * Leggi tutti i folders da Firestore
 * @returns {Promise<Array>} - Array di folders
 */
export const leggiFolders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'folders'));
    const folders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      _id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Letti ${folders.length} folders da Firebase`);
    return folders;
  } catch (error) {
    console.error("❌ Errore lettura folders:", error);
    throw error;
  }
};

/**
 * Aggiorna un folder esistente
 * @param {string} folderId - ID del folder
 * @param {Object} updates - Campi da aggiornare
 */
export const aggiornaFolder = async (folderId, updates) => {
  try {
    const folderRef = doc(db, 'folders', folderId);
    await updateDoc(folderRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    console.log("✅ Folder aggiornato:", folderId);
  } catch (error) {
    console.error("❌ Errore aggiornamento folder:", error);
    throw error;
  }
};

// ==================== TRASPORTATORI ====================

/**
 * Salva un trasportatore su Firestore
 * @param {Object} transporter - Oggetto trasportatore da salvare
 * @returns {Promise<string>} - ID del trasportatore salvato
 */
export const salvaTrasportatore = async (transporter) => {
  try {
    const transporterData = {
      ...transporter,
      createdAt: transporter.createdAt || new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, 'transporters'), transporterData);
    console.log("✅ Trasportatore salvato su Firebase con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Errore salvataggio trasportatore:", error);
    throw error;
  }
};

/**
 * Leggi tutti i trasportatori da Firestore
 * @returns {Promise<Array>} - Array di trasportatori
 */
export const leggiTrasportatori = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'transporters'));
    const trasportatori = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Letti ${trasportatori.length} trasportatori da Firebase`);
    return trasportatori;
  } catch (error) {
    console.error("❌ Errore lettura trasportatori:", error);
    throw error;
  }
};

/**
 * Elimina un trasportatore
 * @param {string} transporterId - ID del trasportatore
 */
export const eliminaTrasportatore = async (transporterId) => {
  try {
    await deleteDoc(doc(db, 'transporters', transporterId));
    console.log("✅ Trasportatore eliminato:", transporterId);
  } catch (error) {
    console.error("❌ Errore eliminazione trasportatore:", error);
    throw error;
  }
};

// ==================== UTILITY ====================

/**
 * Inizializza i dati mock su Firebase (solo per testing/sviluppo)
 * @param {Object} mockData - Dati mock da caricare
 */
export const inizializzaDatiMockFirebase = async (mockData) => {
  try {
    console.log("🔄 Inizializzazione dati mock su Firebase...");
    
    // Salva folders
    for (const folder of mockData.folders) {
      await salvaFolder(folder);
    }
    
    // Salva documenti
    for (const documento of mockData.documents) {
      await salvaDocumento(documento);
    }
    
    // Salva trasportatori
    for (const transporter of mockData.transporters) {
      await salvaTrasportatore(transporter);
    }
    
    console.log("✅ Dati mock caricati su Firebase");
  } catch (error) {
    console.error("❌ Errore inizializzazione dati mock:", error);
    throw error;
  }
};

/**
 * Sincronizza localStorage con Firebase (migrazione)
 */
export const sincronizzaLocalStorageConFirebase = async () => {
  try {
    console.log("🔄 Sincronizzazione localStorage → Firebase...");
    
    // Leggi da localStorage
    const localFolders = JSON.parse(localStorage.getItem('mockFolders') || '[]');
    const localDocuments = JSON.parse(localStorage.getItem('mockDocuments') || '[]');
    const localTransporters = JSON.parse(localStorage.getItem('transporters') || '[]');
    
    // Salva su Firebase
    for (const folder of localFolders) {
      await salvaFolder(folder);
    }
    
    for (const documento of localDocuments) {
      await salvaDocumento(documento);
    }
    
    for (const transporter of localTransporters) {
      await salvaTrasportatore(transporter);
    }
    
    console.log("✅ Sincronizzazione completata");
    return {
      folders: localFolders.length,
      documents: localDocuments.length,
      transporters: localTransporters.length
    };
  } catch (error) {
    console.error("❌ Errore sincronizzazione:", error);
    throw error;
  }
};

// Esporta anche window globals per compatibilità (se necessario)
if (typeof window !== 'undefined') {
  window.salvaDocumento = salvaDocumento;
  window.leggiDocumenti = leggiDocumenti;
  window.leggiFolders = leggiFolders;
  window.leggiTrasportatori = leggiTrasportatori;
  window.sincronizzaLocalStorageConFirebase = sincronizzaLocalStorageConFirebase;
}
