import api from './api';

export const leadService = {
    getAll: (params) => api.get('/leads/', { params }),
    get: (id) => api.get(`/leads/${id}/`),
    create: (data) => {
        // Handle FormData for file uploads
        const config = data instanceof FormData
            ? { headers: { 'Content-Type': 'multipart/form-data' } }
            : {};
        return api.post('/leads/', data, config);
    },
    update: (id, data) => {
        const config = data instanceof FormData
            ? { headers: { 'Content-Type': 'multipart/form-data' } }
            : {};
        return api.put(`/leads/${id}/`, data, config);
    },
    patch: (id, data) => api.patch(`/leads/${id}/`, data),
    delete: (id) => api.delete(`/leads/${id}/`),

    // Stages CRUD
    getStages: () => api.get('/lead-stages/'),
    createStage: (data) => api.post('/lead-stages/', data),
    updateStage: (id, data) => api.put(`/lead-stages/${id}/`, data),
    deleteStage: (id) => api.delete(`/lead-stages/${id}/`),
    reorderStages: (orders) => api.post('/lead-stages/reorder/', { orders }),

    // Kanban & Statistics
    getKanban: (params) => api.get('/leads/kanban/', { params }),
    loadMoreKanban: (params) => api.get('/leads/kanban_load_more/', { params }),
    getStatistics: (params) => api.get('/leads/statistics/', { params }),

    // Convert lead to client
    convert: (id, data) => api.post(`/leads/${id}/convert/`, data),

    // Archive/Unarchive
    archive: (id) => api.post(`/leads/${id}/archive/`),
    unarchive: (id) => api.post(`/leads/${id}/unarchive/`),

    // Reminders
    getReminders: () => api.get('/leads/reminders/'),

    // Export to Excel
    exportExcel: (params) => api.get('/leads/export/', {
        params,
        responseType: 'blob'
    }),
};
