import Echo from 'laravel-echo';

const io = require('socket.io-client');

export default ({ app }, inject) => {
  window.io = io;

  const echo = new Echo({
    broadcaster: 'socket.io',
    host: 'http://localhost:6001' // Asegúrate de que el puerto coincida con tu servidor de WebSockets
  });

  inject('echo', echo);
};
