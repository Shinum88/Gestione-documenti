import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import OperatorDashboard from './components/OperatorDashboard';
import CargoManagerDashboard from './components/CargoManagerDashboard';
import CameraScanner from './components/CameraScanner';
import { Toaster } from 'sonner';

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

  // Mock data per simulare database
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);

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
  );
}

export default App;