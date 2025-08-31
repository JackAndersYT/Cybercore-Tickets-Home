import api from './api';

const getAll = async (page = 1, limit = 6) => {
    // Ahora pasamos los parámetros de página y límite a la API
    const response = await api.get('/users', {
        params: { page, limit }
    });
    return response.data;
};

const update = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

const remove = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

const register = async (userData) => {
    const response = await api.post('/users/register', userData);
    return response.data;
};

const updatePassword = async (id, password) => {
    const response = await api.put(`/users/${id}/password`, { password });
    return response.data;
};

export default {
    getAll,
    update,
    remove,
    register,
    updatePassword
};