import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { toast } from 'sonner';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import { resetMockData } from '../utils/mockData';
import TransporterManager from './TransporterManager';
import SignatureCanvas from './SignatureCanvas';

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
  
  // Stato per gestione trasportatori e firma
  const [showTransporterManager, setShowTransporterManager] = useState(false);
  const [transporters, setTransporters] = useState([]);
  const [showSignatureOptions, setShowSignatureOptions] = useState(false);
  const [showSealNumberDialog, setShowSealNumberDialog] = useState(false);
  const [sealNumberData, setSealNumberData] = useState({ transporter: '', number: '' });
  const [showDocumentProcessor, setShowDocumentProcessor] = useState(false);

  const terzisti = ['Danesi', 'Happening', 'Almax', 'Veliero', 'Gab', 'Kuoyo'];

  // Inizializza trasportatori dal localStorage
  React.useEffect(() => {
    const savedTransporters = JSON.parse(localStorage.getItem('transporters') || '[]');
    setTransporters(savedTransporters);
  }, []);

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

  const handleApplySignature = () => {
    if (selectedDocuments.size === 0) {
      toast.error('Seleziona almeno un documento');
      return;
    }

    // Controlla se ci sono documenti già firmati
    const selectedDocs = documents.filter(doc => selectedDocuments.has(doc._id));
    const alreadySigned = selectedDocs.filter(doc => doc.signed);
    
    if (alreadySigned.length > 0) {
      toast.error('Alcuni documenti sono già firmati');
      return;
    }

    // Verifica che ci siano trasportatori registrati
    if (transporters.length === 0) {
      toast.error('Registra prima almeno un trasportatore per poter applicare la firma');
      setShowTransporterManager(true);
      return;
    }

    // Apri il processore documenti A4 automatico
    setShowDocumentProcessor(true);
  };

  const handleDocumentsProcessed = (processedDocs) => {
    // Aggiorna i documenti con quelli processati
    const updatedDocuments = documents.map(doc => {
      const processed = processedDocs.find(p => p._id === doc._id);
      return processed || doc;
    });
    
    setDocuments(updatedDocuments);
    
    // Aggiorna stato cartelle
    const folderIds = processedDocs.map(doc => doc.folderId);
    const uniqueFolderIds = [...new Set(folderIds)];
    
    const updatedFolders = folders.map(folder => {
      if (uniqueFolderIds.includes(folder._id)) {
        const folderDocs = getDocumentsForFolder(folder._id);
        const allSigned = folderDocs.every(doc => 
          processedDocs.some(p => p._id === doc._id) || doc.signed
        );
        
        if (allSigned) {
          return { ...folder, status: 'signed' };
        }
      }
      return folder;
    });
    
    setFolders(updatedFolders);
    setSelectedDocuments(new Set());
    setShowDocumentProcessor(false);
    
    toast.success(`${processedDocs.length} documenti processati con struttura A4`);
  };

  const handleLoadMockData = () => {
    const initialized = resetMockData(setFolders, setDocuments, setTransporters);
    if (initialized) {
      toast.success('Dati mock caricati per testing');
    } else {
      toast.info('Dati mock già presenti');
    }
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
        // Gestisci documenti elaborati con DDT Processor
        if (doc.processedWithDDT && doc.pdfData) {
          // Usa PDF elaborato direttamente
          const pdfData = doc.pdfData.split(',')[1]; // Rimuovi data:application/pdf;base64,
          const filename = doc.sealNumber 
            ? `${doc.name}_DDT_Sigillo_${doc.sealNumber}.pdf`
            : `${doc.name}_DDT_Firmato.pdf`;
          zip.file(filename, pdfData, { base64: true });
          
        } else {
          // Fallback: crea PDF dalle pagine (metodo classico)
          const pdf = new jsPDF();
          
          for (let i = 0; i < doc.pages.length; i++) {
            if (i > 0) pdf.addPage();
            
            const imgWidth = 190;
            const imgHeight = 270;
            pdf.addImage(doc.pages[i], 'JPEG', 10, 10, imgWidth, imgHeight);
            
            // Aggiungi firma sulla prima pagina (metodo classico)
            if (i === 0 && doc.signature?.image) {
              const signatureWidth = 50;
              const signatureHeight = 25;
              const x = 190 - signatureWidth; // 90% width
              const y = 270 - signatureHeight; // 95% height
              
              pdf.addImage(doc.signature.image, 'PNG', x, y, signatureWidth, signatureHeight);
            }
            
            // Aggiungi numero sigillo sulla prima pagina (metodo classico)
            if (i === 0 && doc.sealNumber) {
              pdf.setFontSize(10);
              pdf.setTextColor(0, 0, 0);
              pdf.text(`Sigillo: ${doc.sealNumber}`, 10, 270);
              
              if (doc.transporterName) {
                pdf.text(`Trasportatore: ${doc.transporterName}`, 10, 275);
              }
            }
          }
          
          const pdfBlob = pdf.output('blob');
          const filename = doc.sealNumber 
            ? `${doc.name}_sigillo_${doc.sealNumber}.pdf`
            : `${doc.name}_firmato.pdf`;
          zip.file(filename, pdfBlob);
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download del file ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documenti_DDT_elaborati_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const ddtProcessedCount = selectedDocs.filter(doc => doc.processedWithDDT).length;
      const message = ddtProcessedCount > 0 
        ? `Scaricati ${selectedDocs.length} documenti (${ddtProcessedCount} con elaborazione DDT avanzata)`
        : `Scaricati ${selectedDocs.length} documenti`;
        
      toast.success(message);
      setSelectedDocuments(new Set());
      
    } catch (error) {
      console.error('Errore generazione ZIP:', error);
      toast.error('Errore durante la generazione del file ZIP');
    }
    
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <button className="logout-btn" onClick={handleLogout}>
        Esci
      </button>
      
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard Carico Merci</h1>
          <p className="dashboard-subtitle">
            Benvenuto, {user?.username}. Gestisci i documenti e applica le firme.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', position: 'absolute', top: '2rem', left: '2rem' }}>
          <button 
            className="btn-action btn-secondary"
            onClick={handleLoadMockData}
            style={{ 
              background: '#6366f1', 
              color: 'white',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem'
            }}
          >
            📋 Carica Dati Test
          </button>
          <button 
            className="btn-action btn-secondary"
            onClick={() => setShowTransporterManager(true)}
            style={{ 
              background: '#10b981', 
              color: 'white',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem'
            }}
          >
            👥 Gestisci Trasportatori
          </button>
        </div>
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
          {/* Solo per documenti non firmati */}
          {(() => {
            const selectedDocs = documents.filter(doc => selectedDocuments.has(doc._id));
            const hasUnsignedDocs = selectedDocs.some(doc => !doc.signed);
            
            return hasUnsignedDocs && (
              <button 
                className="btn-action btn-sign"
                onClick={handleApplySignature}
                disabled={loading}
              >
                {loading ? 'Elaborazione DDT...' : `🔄 Elabora DDT + Firma (${selectedDocuments.size})`}
              </button>
            );
          })()}
          
          {/* Bottone per scaricare documenti firmati come ZIP */}
          {(() => {
            const selectedDocs = documents.filter(doc => selectedDocuments.has(doc._id));
            const hasSignedDocs = selectedDocs.some(doc => doc.signed);
            
            return hasSignedDocs && (
              <button 
                className="btn-action"
                onClick={downloadSelectedAsZip}
                disabled={loading}
                style={{ background: '#059669', color: 'white' }}
              >
                {loading ? 'Generando ZIP...' : `📦 Scarica ZIP Documenti Firmati (${selectedDocs.filter(doc => doc.signed).length})`}
              </button>
            );
          })()}
          
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
                        <div className="document-name" style={{ flex: 1 }}>
                          <div>
                            {doc.name} ({doc.pages.length} pag.)
                          </div>
                          {doc.signed && (
                            <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.25rem' }}>
                              ✓ Firmato da: {doc.transporterName} ({doc.transporterCompany})
                              {doc.sealNumber && (
                                <span style={{ marginLeft: '0.5rem', color: '#f59e0b' }}>
                                  🏷️ Sigillo: {doc.sealNumber}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
      
      {/* Processore documenti A4 */}
      {showDocumentProcessor && (
        <DocumentSignatureManager
          documents={documents.filter(doc => selectedDocuments.has(doc._id))}
          transporters={transporters}
          onDocumentsProcessed={handleDocumentsProcessed}
          onClose={() => setShowDocumentProcessor(false)}
        />
      )}
      
      {/* Gestione trasportatori */}
      {showTransporterManager && (
        <TransporterManager
          transporters={transporters}
          setTransporters={setTransporters}
          onClose={() => setShowTransporterManager(false)}
        />
      )}
      
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