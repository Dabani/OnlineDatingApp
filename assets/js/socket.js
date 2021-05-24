$(function(){
  let socket = io();

  socket.on('connect', function(socketio) {
    console.log('Client is connected to Server');
  });

  // Catch User Unique Id from Browser
  let ID = $('#ID').val();
  socket.emit('ID',{ID:ID});
  
  socket.on('disconnect', function(){
    console.log('Client is disconnected from Server');
  });
});