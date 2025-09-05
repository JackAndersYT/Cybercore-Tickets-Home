import api from './api'; // Usamos la instancia de Axios con el token

const create = async (ticketData) => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
};
const getAll = async (page = 1, filters = {}) => {
    const { searchTerm, status, dateFrom, dateTo } = filters;
    const response = await api.get('/tickets', {
        params: { 
            page, 
            searchTerm,
            status,
            dateFrom,
            dateTo
        }
    });
    return response.data;
};
const getById = async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
};
const updateStatus = async (id, status) => {
    const response = await api.put(`/tickets/${id}/status`, { status });
    return response.data;
};
const update = async (id, ticketData) => {
    const response = await api.put(`/tickets/${id}`, ticketData);
    return response.data;
};
const getMessages = async (ticketId) => {
    const response = await api.get(`/tickets/${ticketId}/messages`);
    return response.data;
};

const addMessage = async (ticketId, formData, socketId) => {
    const response = await api.post(`/tickets/${ticketId}/messages?socketId=${socketId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};
const markAsRead = async (ticketId) => {
    const response = await api.put(`/tickets/${ticketId}/messages/read`);
    return response.data;
};

const cancel= async (id) => {
        const response = await api.put(`/tickets/${id}/cancel`);
        return response.data;
};

const ticketService = {
    create,
    getAll,
    getById,
    updateStatus,
    update,
    getMessages,
    addMessage,
    markAsRead,
    cancel,
};

export default ticketService;