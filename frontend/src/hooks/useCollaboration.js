import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../services/api';

export function useCollaboration(noteId) {
  const [socket, setSocket] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const socketRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getCurrentUser
  });

  useEffect(() => {
    if (!noteId || !currentUser) return;

    // Create socket connection
    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      withCredentials: true
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Join note room
    newSocket.emit('join-note', {
      noteId,
      user: currentUser
    });

    // Listen for user events
    newSocket.on('user-joined', (user) => {
      setConnectedUsers(prev => [...prev.filter(u => u.userId !== user.userId), user]);
    });

    newSocket.on('user-left', (user) => {
      setConnectedUsers(prev => prev.filter(u => u.userId !== user.userId));
      setCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[user.userId];
        return newCursors;
      });
    });

    newSocket.on('room-users', (users) => {
      setConnectedUsers(users);
    });

    newSocket.on('cursor-update', (data) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: data
      }));
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setConnectedUsers([]);
      setCursors({});
    };
  }, [noteId, currentUser]);

  const updateCursor = (position) => {
    if (socket) {
      socket.emit('cursor-update', {
        position,
        timestamp: Date.now()
      });
    }
  };

  return {
    socket,
    connectedUsers,
    cursors,
    updateCursor,
    isConnected: socket?.connected || false
  };
}