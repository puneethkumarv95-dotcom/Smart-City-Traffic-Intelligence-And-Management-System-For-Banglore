import api from './api';

export const incidentService = {
  getIncidents: async (params = {}) => {
    const response = await api.get('/incidents', { params });
    return response.data;
  },

  getNearbyIncidents: async (latitude, longitude, radiusMeters = 5000) => {
    const response = await api.get('/incidents/nearby', {
      params: { latitude, longitude, radiusMeters }
    });
    return response.data;
  },

  getIncidentById: async (id) => {
    const response = await api.get(`/incidents/${id}`);
    return response.data;
  },

  reportIncident: async (formData) => {
    const response = await api.post('/incidents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  voteIncident: async (id, voteType) => {
    const response = await api.post(`/incidents/${id}/vote`, { voteType });
    return response.data;
  },

  verifyIncident: async (id, notes = '') => {
    const response = await api.post(`/incidents/${id}/verify`, { notes });
    return response.data;
  },

  rejectIncident: async (id, reason) => {
    const response = await api.post(`/incidents/${id}/reject`, { reason });
    return response.data;
  },

  assignIncident: async (id, officerId, notes = '') => {
    const response = await api.post(`/incidents/${id}/assign`, { officerId, notes });
    return response.data;
  },

  updateIncidentStatus: async (id, status, notes = '') => {
    const response = await api.patch(`/incidents/${id}/status`, { status, notes });
    return response.data;
  },

  submitFeedback: async (id, rating, comments = '') => {
    const response = await api.post(`/incidents/${id}/feedback`, { rating, comments });
    return response.data;
  }
};

export default incidentService;
