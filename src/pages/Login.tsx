import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const Login: React.FC = () => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/mode-selection');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!key || key.length < 8) {
      setError('Key must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    const success = login(key);

    if (success) {
      navigate('/mode-selection');
    } else {
      setError('Invalid key');
      setKey('');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter key"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !key || key.length < 8}
            className="w-full"
          >
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
