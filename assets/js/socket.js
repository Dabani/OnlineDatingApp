$(function(){
  let socket = io();

  socket.on('connect', function(socketio) {
    console.log('Client is connected to Server');
  });

  socket.on('disconnect', function(){
    console.log('Client is disconnected from Server');
  });
});