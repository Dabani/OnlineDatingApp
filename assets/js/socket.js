$(function(){
  let socket = io();

  socket.on('connect', function(socketio) {
    console.log('Client is connected to Server');
  });

  // Listen event
  socket.on('newMessage', function(message){
    console.log(message);
  });

  socket.on('disconnect', function(){
    console.log('Client is disconnected from Server');
  });
});