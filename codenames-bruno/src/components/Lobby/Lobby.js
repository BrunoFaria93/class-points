import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import useSocket from '../hooks/useSocket';

const Lobby = () => {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');

    useSocket('rooms-update', (roomsData) => {
        console.log('Rooms update received in Lobby:', roomsData);
        setRooms(roomsData);
    });

    const createRoom = () => {
        if (newRoomName.trim()) {
            const socket = io(); // Crie uma instância de socket aqui
            socket.emit('create-room', { roomId: newRoomName });
            setNewRoomName('');
        }
    };

    const deleteRoom = (roomId) => {
        const socket = io();
        socket.emit('delete-room', { roomId });
    };

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">Lobby</h1>
            <div className="mb-4">
                <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 mr-2"
                    placeholder="Enter room name"
                />
                <button onClick={createRoom} className="bg-blue-500 text-white px-4 py-2 rounded">
                    Create Room
                </button>
            </div>
            <div>
                {rooms.length > 0 ? (
                    <ul>
                        {rooms.map((room) => (
                            <li key={room.roomId} className="flex items-center mb-2">
                                <a href={`/room/${room.roomId}`} className="text-blue-500 underline mr-4">
                                    Room {room.roomId}
                                </a>
                                <button
                                    onClick={() => deleteRoom(room.roomId)}
                                    className="bg-red-500 text-white px-3 py-1 rounded"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No rooms available.</p>
                )}
            </div>
        </div>
    );
};

export default Lobby;
