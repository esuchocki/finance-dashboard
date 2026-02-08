import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/context/AuthContext';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/business/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 text-center">

        <div className="flex justify-center">
          <GoogleLogin
            hosted_domain="karmecholing.org"
            onSuccess={(response) => {
              if (!response.credential) {
                setError('No credential received. Please try again.');
                return;
              }
              const result = loginWithGoogle(response.credential);
              if (result.success) {
                navigate('/business/dashboard');
              } else {
                setError(result.error || 'Authentication failed.');
              }
            }}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

      </div>
    </div>
  );
};

export default Login;
