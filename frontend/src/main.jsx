import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'; // 1. Importar el Router aquí
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import  NotificationProvider  from './context/NotificationContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router> {/* 2. Envolver toda la aplicación con el Router */}
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>,
)
