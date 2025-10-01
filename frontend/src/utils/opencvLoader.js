/**
 * OpenCV.js Loader - Sistema centralizzato per evitare conflitti di caricamento
 * Risolve il problema "Cannot register public name 'IntVector' twice"
 */

class OpenCVLoader {
  constructor() {
    this.isLoading = false;
    this.isLoaded = false;
    this.opencv = null;
    this.callbacks = [];
    this.errorCallbacks = [];
  }

  /**
   * Carica OpenCV.js in modo sicuro (una sola volta)
   */
  async loadOpenCV() {
    return new Promise((resolve, reject) => {
      // Se già caricato, restituisci immediatamente
      if (this.isLoaded && this.opencv) {
        console.log('✅ OpenCV già disponibile (cache)');
        resolve(this.opencv);
        return;
      }

      // Se già in caricamento, aggiungi callback
      if (this.isLoading) {
        console.log('⏳ OpenCV in caricamento, aggiungo callback...');
        this.callbacks.push(resolve);
        this.errorCallbacks.push(reject);
        return;
      }

      // Controlla se OpenCV è già disponibile globalmente
      if (window.cv && window.cv.Mat) {
        console.log('✅ OpenCV già disponibile (globale)');
        this.opencv = window.cv;
        this.isLoaded = true;
        resolve(this.opencv);
        return;
      }

      // Inizia il caricamento
      this.isLoading = true;
      this.callbacks.push(resolve);
      this.errorCallbacks.push(reject);

      this._loadScript();
    });
  }

  /**
   * Carica lo script OpenCV.js dal CDN
   */
  _loadScript() {
    // Controlla se lo script esiste già
    const existingScript = document.querySelector('script[src*="opencv.js"]');
    if (existingScript) {
      console.log('📜 Script OpenCV già presente, attendo inizializzazione...');
      this._waitForInitialization();
      return;
    }

    console.log('🔄 Caricamento OpenCV.js da CDN...');
    
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.x/opencv.js';
    script.async = true;
    script.id = 'opencv-main-script';
    
    script.onload = () => {
      console.log('📦 Script OpenCV caricato, attendo runtime...');
      this._waitForInitialization();
    };
    
    script.onerror = (error) => {
      console.error('❌ Errore caricamento script OpenCV:', error);
      this._handleError(new Error('Impossibile caricare OpenCV.js dal CDN'));
    };
    
    document.head.appendChild(script);
  }

  /**
   * Attende che OpenCV sia completamente inizializzato
   */
  _waitForInitialization() {
    const checkInterval = 50; // ms
    const maxAttempts = 600; // 30 secondi
    let attempts = 0;

    const check = () => {
      attempts++;

      if (window.cv && window.cv.Mat) {
        console.log('✅ OpenCV runtime completamente inizializzato');
        this._handleSuccess(window.cv);
        return;
      }

      if (window.cv && typeof window.cv.onRuntimeInitialized === 'undefined') {
        // OpenCV è presente ma non ha onRuntimeInitialized, potrebbe essere già pronto
        console.log('🔍 Verifico disponibilità funzioni OpenCV...');
        
        try {
          // Test rapido per verificare se OpenCV è utilizzabile
          if (window.cv.Mat && window.cv.cvtColor && window.cv.imread) {
            console.log('✅ OpenCV verificato e funzionante');
            this._handleSuccess(window.cv);
            return;
          }
        } catch (testError) {
          console.log('⏳ OpenCV non ancora pronto, continuo ad attendere...');
        }
      }

      if (window.cv && window.cv.onRuntimeInitialized === null) {
        // Imposta callback se non è già impostato
        window.cv.onRuntimeInitialized = () => {
          console.log('✅ OpenCV onRuntimeInitialized chiamato');
          this._handleSuccess(window.cv);
        };
      }

      if (attempts >= maxAttempts) {
        console.error('❌ Timeout inizializzazione OpenCV');
        this._handleError(new Error('Timeout inizializzazione OpenCV dopo 30 secondi'));
        return;
      }

      setTimeout(check, checkInterval);
    };

    check();
  }

  /**
   * Gestisce il successo del caricamento
   */
  _handleSuccess(cv) {
    this.opencv = cv;
    this.isLoaded = true;
    this.isLoading = false;

    // Chiama tutti i callback in attesa
    this.callbacks.forEach(callback => {
      try {
        callback(cv);
      } catch (error) {
        console.error('Errore nel callback OpenCV:', error);
      }
    });

    // Reset array callback
    this.callbacks = [];
    this.errorCallbacks = [];
  }

  /**
   * Gestisce gli errori di caricamento
   */
  _handleError(error) {
    this.isLoading = false;

    // Chiama tutti i callback di errore
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Errore nel callback di errore:', callbackError);
      }
    });

    // Reset array callback
    this.callbacks = [];
    this.errorCallbacks = [];
  }

  /**
   * Ottieni lo stato corrente
   */
  getStatus() {
    return {
      isLoading: this.isLoading,
      isLoaded: this.isLoaded,
      opencv: this.opencv
    };
  }

  /**
   * Reset del loader (per debug/sviluppo)
   */
  reset() {
    this.isLoading = false;
    this.isLoaded = false;
    this.opencv = null;
    this.callbacks = [];
    this.errorCallbacks = [];
  }
}

// Istanza singleton
const opencvLoader = new OpenCVLoader();

// Hook React per uso semplificato
export const useOpenCV = () => {
  const [opencv, setOpencv] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    opencvLoader.loadOpenCV()
      .then((cv) => {
        setOpencv(cv);
        setIsLoading(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return { opencv, isLoading, error };
};

export default opencvLoader;