import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import OperatorDashboard from './components/OperatorDashboard';
import CargoManagerDashboard from './components/CargoManagerDashboard';
import CameraScanner from './components/CameraScanner';
import { Toaster } from 'sonner';
import { initializeMockData } from './utils/mockData';
import { OpenCVProvider } from './contexts/OpenCVContext';

// Context per gestione stato globale
const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

function App() {
  const [user, setUser] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentDocument, setCurrentDocument] = useState({ pages: [] });

  // Dati da Firebase
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Carica dati da Firebase al caricamento dell'app
  useEffect(() => {
    const loadDataFromFirebase = async () => {
      try {
        console.log('📥 Caricando dati da Firebase...');
        
        // Attendi che Firebase sia inizializzato
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Carica folders e documents da Firebase
        const [firebaseFolders, firebaseDocuments] = await Promise.all([
          window.leggiFolders(),
          window.leggiDocumenti()
        ]);
        
        console.log(`✅ Caricati ${firebaseFolders.length} folders e ${firebaseDocuments.length} documenti da Firebase`);
        
        // Ricalcola lo status delle cartelle basandosi sui documenti firmati
        const foldersWithCorrectStatus = firebaseFolders.map(folder => {
          const folderDocs = firebaseDocuments.filter(doc => 
            doc.folderId === folder._id || doc.folderId === folder.id
          );
          
          if (folderDocs.length === 0) {
            return folder; // Mantieni status originale se non ci sono documenti
          }
          
          // Se tutti i documenti sono firmati, status = 'signed'
          // Se almeno uno non è firmato, status = 'pending'
          const allSigned = folderDocs.every(doc => doc.signed === true);
          const newStatus = allSigned ? 'signed' : 'pending';
          
          if (newStatus !== folder.status) {
            console.log(`🔄 Aggiornato status folder ${folder.name}: ${folder.status} → ${newStatus}`);
          }
          
          return { ...folder, status: newStatus };
        });
        
        setFolders(foldersWithCorrectStatus);
        setDocuments(firebaseDocuments);
        
        // Se non ci sono dati, inizializza con mock data
        if (firebaseFolders.length === 0 && firebaseDocuments.length === 0) {
          console.log('ℹ️ Nessun dato su Firebase, inizializzo mock data...');
          initializeMockData(setFolders, setDocuments);
        }
        
      } catch (error) {
        console.error('❌ Errore caricamento dati da Firebase:', error);
        // Fallback a mock data se Firebase fallisce
        console.log('⚠️ Fallback a mock data locale');
        initializeMockData(setFolders, setDocuments);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadDataFromFirebase();
  }, []);

  const contextValue = {
    user,
    setUser,
    currentFolder,
    setCurrentFolder,
    currentDocument,
    setCurrentDocument,
    folders,
    setFolders,
    documents,
    setDocuments
  };

  return (
    <OpenCVProvider>
      <AppContext.Provider value={contextValue}>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/operator" element={
                user?.role === 'operatore' 
                  ? <OperatorDashboard /> 
                  : <Navigate to="/login" replace />
              } />
              <Route path="/scanner" element={
                user?.role === 'operatore' 
                  ? <CameraScanner /> 
                  : <Navigate to="/login" replace />
              } />
              <Route path="/cargo-manager" element={
                user?.role === 'carico_merci' 
                  ? <CargoManagerDashboard /> 
                  : <Navigate to="/login" replace />
              } />
              <Route path="/" element={
                user 
                  ? <Navigate to={user.role === 'operatore' ? '/operator' : '/cargo-manager'} replace />
                  : <Navigate to="/login" replace />
              } />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </div>
      </AppContext.Provider>
    </OpenCVProvider>
  );
}

export default App;