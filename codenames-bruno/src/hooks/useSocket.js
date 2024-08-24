import { useEffect } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';

const useSocket = (event, callback) => {
    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
        });

        const handleEvent = (data) => {
            console.log(`Received ${event}:`, data);
            callback(data);
        };

        socket.on(event, handleEvent);

        return () => {
            socket.off(event, handleEvent);
            socket.disconnect();
        };
    }, [event, callback]);
};

export default useSocket;
