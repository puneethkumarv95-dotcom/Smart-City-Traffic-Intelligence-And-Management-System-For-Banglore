import api from './api';

export const incidentService = {
  // Query all incidents with filters
  getIncidents: async (params = {}) => {
    const response = await api.get('/incidents', { params });
    return response.data;
  },

  // Citizen's own incident reports
  getMyIncidents: async (params = {}) => {
    const response = await api.get('/incidents/my', { params });
    return response.data;
  },

  // Geospatial search
  getNearbyIncidents: async (latitude, longitude, radiusMeters = 5000) => {
    const response = await api.get('/incidents/nearby', {
      params: { latitude, longitude, radiusMeters }
    });
    return response.data;
  },

  // Check potential duplicates before submission
  checkDuplicates: async (data) => {
    const response = await api.post('/incidents/check-duplicates', data);
    return response.data;
  },

  // List available officers with active workload
  getAvailableOfficers: async (zoneId = '') => {
    const params = zoneId ? { zoneId } : {};
    const response = await api.get('/incidents/officers', { params });
    return response.data;
  },

  // Get incident by ID or incidentId
  getIncidentById: async (id) => {
    const response = await api.get(`/incidents/${id}`);
    return response.data;
  },

  // Get lifecycle history timeline
  getIncidentHistory: async (id) => {
    const response = await api.get(`/incidents/${id}/history`);
    return response.data;
  },

  // Report new incident
  reportIncident: async (formData) => {
    const response = await api.post('/incidents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Vote on incident (confirm/dispute with vote-change support)
  voteIncident: async (id, voteType) => {
    const response = await api.post(`/incidents/${id}/vote`, { voteType });
    return response.data;
  },

  // Police/Admin verification
  verifyIncident: async (id, notes = '', priority = null) => {
    const payload = { notes };
    if (priority) payload.priority = priority;
    const response = await api.post(`/incidents/${id}/verify`, payload);
    return response.data;
  },

  // Police/Admin rejection
  rejectIncident: async (id, reason) => {
    const response = await api.post(`/incidents/${id}/reject`, { reason });
    return response.data;
  },

  // Police/Admin request more information
  requestAdditionalInfo: async (id, notes) => {
    const response = await api.post(`/incidents/${id}/request-info`, { notes });
    return response.data;
  },

  // Police/Admin assign officer
  assignIncident: async (id, officerId, notes = '') => {
    const response = await api.post(`/incidents/${id}/assign`, { officerId, notes });
    return response.data;
  },

  // Police/Admin mark as duplicate
  markDuplicate: async (id, duplicateOf, notes = '') => {
    const response = await api.post(`/incidents/${id}/duplicate`, { duplicateOf, notes });
    return response.data;
  },

  // Update incident status (e.g. in_progress, resolved)
  updateIncidentStatus: async (id, status, notes = '') => {
    const response = await api.patch(`/incidents/${id}/status`, { status, notes });
    return response.data;
  },

  // Citizen submit resolution feedback
  submitFeedback: async (id, rating, comments = '') => {
    const response = await api.post(`/incidents/${id}/feedback`, { rating, comments });
    return response.data;
  },

  // Super Admin incident statistics aggregation
  getAdminStatistics: async () => {
    const response = await api.get('/admin/incidents/statistics');
    return response.data;
  }
};

export default incidentService;
