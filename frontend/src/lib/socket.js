import { io } from 'socket.io-client';

// autoConnect: false - App connects explicitly once the user is authenticated,
// so we don't open (and have rejected) a socket before login.
export const socket = io({ autoConnect: false, withCredentials: true });
