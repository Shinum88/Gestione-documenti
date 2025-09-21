import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { toast } from 'sonner';

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const { user, setUser, folders, setFolders, setCurrentFolder } = useAppContext();
  const [loading, setLoading] = useState(false);

  const terzisti = ['Danesi', 'Happening', 'Almax', 'Veliero', 'Gab', 'Kuoyo'];

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleTerzistaSelect = async (terzista) => {
    setLoading(true);
    
    // Genera nome cartella con data corrente
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const folderName = `${terzista}_${today}`;
    
    // Simula chiamata API per verificare esistenza cartella
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Controlla se cartella esiste già
    const existingFolder = folders.find(f => f.name === folderName);
    
    if (existingFolder) {
      toast.success('Cartella esistente, procedi con la scansione');
      setCurrentFolder(existingFolder);
    } else {
      // Crea nuova cartella
      const newFolder = {
        _id: Date.now().toString(),
        name: folderName,
        terzista,
        date: new Date().toISOString(),
        status: 'pending'
      };
      
      // Simula POST /api/folders
      const updatedFolders = [...folders, newFolder];
      setFolders(updatedFolders);
      setCurrentFolder(newFolder);
      
      toast.success('Nuova cartella creata');
    }
    
    setLoading(false);
    
    // Naviga al scanner
    navigate('/scanner');
  };

  return (
    <div className="dashboard-container">
      <button className="logout-btn" onClick={handleLogout}>
        Esci
      </button>
      
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard Operatore</h1>
        <p className="dashboard-subtitle">
          Benvenuto, {user?.username}. Seleziona un terzista per iniziare la scansione.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Preparazione cartella...</p>
        </div>
      )}

      <div className="terzista-grid">
        {terzisti.map((terzista) => (
          <div
            key={terzista}
            className="terzista-card"
            onClick={() => !loading && handleTerzistaSelect(terzista)}
            style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <h3 className="terzista-name">{terzista}</h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OperatorDashboard;