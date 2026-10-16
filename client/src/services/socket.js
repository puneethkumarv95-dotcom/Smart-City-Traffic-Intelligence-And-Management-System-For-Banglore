import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('sctims_access_token');
    socket = io(window.location.origin, {
      auth: {
        token: token || ''
      },
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
  }
  return socket;
};

export const reconnectSocketWithAuth = () => {
  if (socket) {
    socket.disconnect();
  }
  const token = localStorage.getItem('sctims_access_token');
  socket = io(window.location.origin, {
    auth: {
      token: token || ''
    },
    transports: ['websocket', 'polling']
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

