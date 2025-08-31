import axios from 'axios';
import { API_BASE_URL } from '../config'; // 1. Importar la URL base

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`, // 2. Usar la variable importada
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export default api;
