import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

const Lobby = () => {
    const router = useRouter();
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [socket, setSocket] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const socketInstance = io('https://hilarious-fishy-handle.glitch.me/', {
            transports: ['websocket', 'polling'],
        });
        setSocket(socketInstance);

        socketInstance.on('rooms-update', (data) => {
            console.log('Rooms update:', data);
            setRooms(data);
        });

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const handleCreateRoom = () => {
        if (newRoomName.trim()) {
            socket.emit('create-room', newRoomName);
            setNewRoomName('');
        }
    };

    const handleJoinRoom = (roomId) => {
        if (rooms.find(room => room.roomId === roomId)) {
            socket.emit('join-room', roomId);
            console.log('Joining room:', roomId);
            setError(null);
            router.push(`/room/${roomId}`);
        } else {
            setError(`Room ${roomId} does not exist.`);
        }
    };

    return (
        <div>
            <h1>Lobby</h1>
            <div>
                <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Enter room name"
                />
                <button onClick={handleCreateRoom}>Create Room</button>
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <ul>
                {rooms.map((room) => (
                    <li key={room.roomId}>
                        {room.roomId}
                        <button onClick={() => handleJoinRoom(room.roomId)}>Join</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Lobby;
