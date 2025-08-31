import { jwtDecode } from 'jwt-decode';
import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api'; // Importamos la instancia de Axios configurada

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            // Obtenemos el token directamente de localStorage para asegurar que sea el más reciente
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                try {
                    // Usamos nuestra instancia 'api' que ya incluye el token en los headers
                    const { data } = await api.get('/users/me');
                    setUser(data); // Guardamos el objeto completo del usuario
                } catch (error) {
                    console.error("No se pudo cargar el usuario, token inválido o expirado.", error);
                    // Si hay un error (ej. 401), limpiamos el estado y localStorage
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        loadUser();
    }, [token]); // Este efecto se ejecuta cada vez que el token cambia

    const login = (newToken) => {
        // Guardamos el token en localStorage
        localStorage.setItem('token', newToken);
        // Actualizamos el estado del token, lo que disparará el useEffect para cargar los datos del usuario
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, loading }}>
            {/* La corrección clave está aquí: No renderizar los hijos hasta que la carga inicial termine */}
            {!loading && children}
        </AuthContext.Provider>
    );
};