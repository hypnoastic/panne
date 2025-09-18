export function setupCollaboration(io) {
  // Simplified collaboration setup without Hocuspocus for now
  // Will be implemented with proper Y.js integration later
  
  // Handle Socket.IO connections for presence
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-note', async (data) => {
      const { noteId, user } = data;
      
      // Join room for this note
      socket.join(`note:${noteId}`);
      
      // Broadcast user presence
      socket.to(`note:${noteId}`).emit('user-joined', {
        userId: user.id,
        name: user.name,
        avatar: user.avatar_url,
        socketId: socket.id
      });
      
      // Send current users in room
      const sockets = await io.in(`note:${noteId}`).fetchSockets();
      const users = sockets.map(s => s.data?.user).filter(Boolean);
      
      socket.emit('room-users', users);
      socket.data.user = user;
      socket.data.noteId = noteId;
    });
    
    socket.on('cursor-update', (data) => {
      if (socket.data.noteId) {
        socket.to(`note:${socket.data.noteId}`).emit('cursor-update', {
          userId: socket.data.user?.id,
          ...data
        });
      }
    });
    
    socket.on('disconnect', () => {
      if (socket.data.noteId && socket.data.user) {
        socket.to(`note:${socket.data.noteId}`).emit('user-left', {
          userId: socket.data.user.id,
          socketId: socket.id
        });
      }
      console.log('User disconnected:', socket.id);
    });
  });
}