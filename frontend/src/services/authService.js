import axios from 'axios';
import { API_BASE_URL } from '../config'; // Importa la URL base

const API_URL = `${API_BASE_URL}/api/users`; // Ahora apunta a Render

const login = async (username, password) => {
    const response = await axios.post(`${API_URL}/login`, {
        username,
        password,
    });

    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
    }

    return response.data;
};

const authService = {
    login,
};

export default authService;
