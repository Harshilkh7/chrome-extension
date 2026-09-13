import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';

export default function PrivateRoute({ children }) {
  const [state, setState] = useState('checking');

  useEffect(() => {
    let mounted = true;
    api.get('/auth/me')
      .then(() => mounted && setState('authenticated'))
      .catch(() => mounted && setState('unauthenticated'));
    return () => { mounted = false; };
  }, []);

  if (state === 'checking') return <div className="min-h-screen flex items-center justify-center">Checking session...</div>;
  if (state === 'unauthenticated') return <Navigate to="/login" replace />;
  return children;
}
