// src/components/Lobby.js
import React, { useState, useEffect } from 'react';
import useSocket from '../hooks/useSocket';

const Lobby = () => {
    const [rooms, setRooms] = useState([]);

    useSocket('rooms-update', (roomsData) => {
        console.log('Rooms update received in Lobby:', roomsData);
        setRooms(roomsData);
    });

    const createRoom = () => {
        if (newRoomName.trim()) {
            console.log("entrei nesse if ")
            const socket = io(); // Crie uma instância de socket aqui
            socket.emit('create-room', { name: newRoomName });
            setNewRoomName('');
        }else{
            console.log("caiu no else")
        }
    };
    console.log("rooms",rooms)
    console.log("OIIIII")
    return (
        <div className="p-4">
            <h1 className="text-xl font-bold">Lobby</h1>
            <button onClick={createRoom} className="bg-blue-500 text-white px-4 py-2 rounded">
                Create Room
            </button>
            <div className="mt-4">
                {rooms.length > 0 ? (
                    <ul>
                        {rooms.map((room) => (
                            <li key={room.roomId}>
                                <a href={`/room/${room.roomId}`} className="text-blue-500 underline">
                                    Room {room.roomId}
                                </a>
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
