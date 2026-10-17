import api from './api';

export const trafficService = {
  // 1. Live or Modeled Traffic Conditions
  getConditions: async () => {
    const response = await api.get('/traffic/conditions');
    return response.data;
  },

  // 2. Incident Concentration Hotspots Heatmap
  getHotspots: async (params = {}) => {
    const response = await api.get('/traffic/hotspots', { params });
    return response.data;
  },

  // 3. Traffic History & Peak-Hour Analytics
  getHistory: async (params = {}) => {
    const response = await api.get('/traffic/history', { params });
    return response.data;
  },

  // 4. Smart Navigation Route Planner
  calculateRoute: async (origin, destination) => {
    const response = await api.post('/traffic/routes', { origin, destination });
    return response.data;
  },

  // 5. Road Closures
  getClosures: async (params = {}) => {
    const response = await api.get('/traffic/closures', { params });
    return response.data;
  },

  createClosure: async (data) => {
    const response = await api.post('/traffic/closures', data);
    return response.data;
  },

  updateClosure: async (id, data) => {
    const response = await api.patch(`/traffic/closures/${id}`, data);
    return response.data;
  },

  deleteClosure: async (id) => {
    const response = await api.delete(`/traffic/closures/${id}`);
    return response.data;
  },

  // 6. Traffic Alerts / Advisories
  getAlerts: async () => {
    const response = await api.get('/traffic/alerts');
    return response.data;
  },

  createAlert: async (data) => {
    const response = await api.post('/traffic/alerts', data);
    return response.data;
  },

  // 7. Commuter Saved Routes
  getSavedRoutes: async () => {
    const response = await api.get('/routes/saved');
    return response.data;
  },

  saveRoute: async (routeData) => {
    const response = await api.post('/routes/saved', routeData);
    return response.data;
  },

  updateSavedRoute: async (id, data) => {
    const response = await api.patch(`/routes/saved/${id}`, data);
    return response.data;
  },

  deleteSavedRoute: async (id) => {
    const response = await api.delete(`/routes/saved/${id}`);
    return response.data;
  },

  checkSavedRouteHazards: async (id) => {
    const response = await api.get(`/routes/saved/${id}/check`);
    return response.data;
  },

  // 8. Notifications
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  markNotificationRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  }
};

export default trafficService;

