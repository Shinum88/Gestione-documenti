import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { toast } from 'sonner';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { resetMockData } from '../utils/mockData';

const CargoManagerDashboard = () => {
  const navigate = useNavigate();
  const { 
    user, 
    setUser, 
    folders, 
    setFolders, 
    documents, 
    setDocuments 
  } = useAppContext();

  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [terzistaFilter, setTerzistaFilter] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'signed'
  const [loading, setLoading] = useState(false);

  const terzisti = ['Danesi', 'Happening', 'Almax', 'Veliero', 'Gab', 'Kuoyo'];

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Filtra cartelle basato su tab attivo e filtri
  const filteredFolders = useMemo(() => {
    let filtered = folders.filter(folder => folder.status === activeTab);
    
    // Filtro per terzista
    if (terzistaFilter) {
      filtered = filtered.filter(folder => 
        folder.terzista === terzistaFilter
      );
    }
    
    // Filtro per data
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

  // Ottieni documenti per cartella
  const getDocumentsForFolder = (folderId) => {
    return documents.filter(doc => doc.folderId === folderId);
  };

  const handleDocumentSelect = (documentId, checked) => {
    const newSelected = new Set(selectedDocuments);
    if (checked) {
      newSelected.add(documentId);
    } else {
      newSelected.delete(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const applySignatureToSelected = async () => {
    if (selectedDocuments.size === 0) {
      toast.error('Seleziona almeno un documento');
      return;
    }

    setLoading(true);
    
    try {
      // Simula applicazione firma
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const updatedDocuments = documents.map(doc => {
        if (selectedDocuments.has(doc._id)) {
          return { ...doc, signed: true };
        }
        return doc;
      });
      
      setDocuments(updatedDocuments);
      
      // Aggiorna stato cartelle
      const folderIds = [...selectedDocuments].map(docId => {
        const doc = documents.find(d => d._id === docId);
        return doc?.folderId;
      }).filter(Boolean);
      
      const uniqueFolderIds = [...new Set(folderIds)];
      
      const updatedFolders = folders.map(folder => {
        if (uniqueFolderIds.includes(folder._id)) {
          const folderDocs = getDocumentsForFolder(folder._id);
          const allSigned = folderDocs.every(doc => 
            selectedDocuments.has(doc._id) || doc.signed
          );
          
          if (allSigned) {
            return { ...folder, status: 'signed' };
          }
        }
        return folder;
      });
      
      setFolders(updatedFolders);
      setSelectedDocuments(new Set());
      
      toast.success(`Firma applicata a ${selectedDocuments.size} documenti`);
      
    } catch (error) {
      console.error('Errore applicazione firma:', error);
      toast.error('Errore durante l\'applicazione della firma');
    }
    
    setLoading(false);
  };

  const downloadSelectedAsZip = async () => {
    const selectedDocs = documents.filter(doc => 
      selectedDocuments.has(doc._id) && doc.signed
    );
    
    if (selectedDocs.length === 0) {
      toast.error('Seleziona almeno un documento firmato');
      return;
    }

    setLoading(true);
    
    try {
      const zip = new JSZip();
      
      for (const doc of selectedDocs) {
        if (doc.pdfData) {
          // Usa PDF esistente
          const pdfData = doc.pdfData.split(',')[1]; // Rimuovi data:application/pdf;base64,
          zip.file(`${doc.name}.pdf`, pdfData, { base64: true });
        } else {
          // Crea PDF dalle pagine
          const pdf = new jsPDF();
          
          for (let i = 0; i < doc.pages.length; i++) {
            if (i > 0) pdf.addPage();
            
            const imgWidth = 190;
            const imgHeight = 270;
            pdf.addImage(doc.pages[i], 'JPEG', 10, 10, imgWidth, imgHeight);
            
            // Aggiungi firma sulla prima pagina
            if (i === 0 && doc.signature?.image) {
              const signatureWidth = 50;
              const signatureHeight = 25;
              const x = 190 - signatureWidth;
              const y = 270 - signatureHeight;
              
              pdf.addImage(doc.signature.image, 'PNG', x, y, signatureWidth, signatureHeight);
            }
          }
          
          const pdfBlob = pdf.output('blob');
          zip.file(`${doc.name}.pdf`, pdfBlob);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download del file ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documenti_firmati_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Scaricati ${selectedDocs.length} documenti`);
      setSelectedDocuments(new Set());
      
    } catch (error) {
      console.error('Errore generazione ZIP:', error);
      toast.error('Errore durante la generazione del file ZIP');
    }
    
    setLoading(false);
  };

  const handleLoadMockData = () => {
    const initialized = resetMockData(setFolders, setDocuments);
    if (initialized) {
      toast.success('Dati mock caricati per testing');
    } else {
      toast.info('Dati mock già presenti');
    }
  };

  return (
    <div className="dashboard-container">
      <button className="logout-btn" onClick={handleLogout}>
        Esci
      </button>
      
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard Carico Merci</h1>
        <p className="dashboard-subtitle">
          Benvenuto, {user?.username}. Gestisci i documenti e applica le firme.
        </p>
      </div>

      {/* Filtri */}
      <div className="filters-container">
        <div className="filter-group">
          <label className="filter-label">Stato</label>
          <select
            className="filter-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="pending">In Attesa</option>
            <option value="signed">Firmati</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Terzista</label>
          <select
            className="filter-select"
            value={terzistaFilter}
            onChange={(e) => setTerzistaFilter(e.target.value)}
          >
            <option value="">Tutti</option>
            {terzisti.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Data Inizio</label>
          <input
            type="date"
            className="filter-input"
            value={dateFilter.start}
            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
          />
        </div>
        
        <div className="filter-group">
          <label className="filter-label">Data Fine</label>
          <input
            type="date"
            className="filter-input"
            value={dateFilter.end}
            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
      </div>

      {/* Barra azioni */}
      {selectedDocuments.size > 0 && (
        <div className="actions-bar">
          <button 
            className="btn-action btn-sign"
            onClick={applySignatureToSelected}
            disabled={loading}
          >
            {loading ? 'Applicando firma...' : `Applica Firma (${selectedDocuments.size})`}
          </button>
          
          {activeTab === 'signed' && (
            <button 
              className="btn-action btn-download"
              onClick={downloadSelectedAsZip}
              disabled={loading}
            >
              {loading ? 'Preparando ZIP...' : 'Scarica ZIP'}
            </button>
          )}
          
          <button 
            className="btn-action"
            onClick={() => setSelectedDocuments(new Set())}
            style={{ background: '#6b7280', color: 'white' }}
          >
            Deseleziona Tutto
          </button>
        </div>
      )}

      {/* Lista cartelle */}
      <div className="folders-grid">
        {filteredFolders.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '3rem',
            color: '#64748b'
          }}>
            <h3>Nessuna cartella trovata</h3>
            <p>Non ci sono cartelle {activeTab === 'pending' ? 'in attesa' : 'firmate'} che corrispondono ai filtri selezionati.</p>
          </div>
        ) : (
          filteredFolders.map(folder => {
            const folderDocuments = getDocumentsForFolder(folder._id);
            
            return (
              <div key={folder._id} className="folder-card">
                <div className="folder-header">
                  <div>
                    <h3 className="folder-name">{folder.name}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                      {new Date(folder.date).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <span className={`folder-status ${folder.status === 'pending' ? 'status-pending' : 'status-signed'}`}>
                    {folder.status === 'pending' ? 'In Attesa' : 'Firmato'}
                  </span>
                </div>
                
                <div className="documents-list">
                  <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>
                    Documenti ({folderDocuments.length})
                  </h4>
                  
                  {folderDocuments.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                      Nessun documento presente
                    </p>
                  ) : (
                    folderDocuments.map(doc => (
                      <div key={doc._id} className="document-item">
                        <input
                          type="checkbox"
                          className="document-checkbox"
                          checked={selectedDocuments.has(doc._id)}
                          onChange={(e) => handleDocumentSelect(doc._id, e.target.checked)}
                        />
                        <span className="document-name">
                          {doc.name} ({doc.pages.length} pag.)
                        </span>
                        {doc.signed && (
                          <span style={{ 
                            color: '#059669', 
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}>
                            ✓ Firmato
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {loading && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div className="loading-spinner" style={{ marginBottom: '1rem' }}></div>
            <p>Operazione in corso...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CargoManagerDashboard;