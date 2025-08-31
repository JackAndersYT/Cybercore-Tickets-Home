import api from './api';

const getStats = async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
};

export default { getStats };