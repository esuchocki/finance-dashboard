import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId="374973156639-9eiecejgi61ri5igiqinhlp8r5u4bd5l.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
