import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { toast } from 'sonner';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAppContext();

  // Credenziali hardcoded
  const credentials = {
    'operatore': { password: 'Welcome00', role: 'operatore' },
    'carico merci': { password: 'Welcome00', role: 'carico_merci' }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simula chiamata API
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userCredentials = credentials[username.toLowerCase()];
    
    if (userCredentials && userCredentials.password === password) {
      const user = { 
        username, 
        role: userCredentials.role 
      };
      
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success(`Benvenuto, ${username}!`);
      
      // Redirect basato sul ruolo
      if (userCredentials.role === 'operatore') {
        navigate('/operator');
      } else {
        navigate('/cargo-manager');
      }
    } else {
      toast.error('Credenziali non valide');
    }
    
    setLoading(false);
  };

  // Auto-login per sviluppo (recupera da localStorage)
  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUser(user);
      navigate(user.role === 'operatore' ? '/operator' : '/cargo-manager');
    }
  }, [setUser, navigate]);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Gestione Documenti</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="operatore / carico merci"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Welcome00"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;