import axios from 'axios';

const API_URL = 'http://192.168.18.7:4000/api/users';

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