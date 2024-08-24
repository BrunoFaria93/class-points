// src/components/Lobby/RoomCard.js
import React from 'react';
import { useHistory } from 'react-router-dom';

const RoomCard = ({ room }) => {
    const history = useHistory();

    const joinRoom = () => {
        history.push(`/room/${room.id}`);
    };

    return (
        <div
            className="p-4 border border-gray-300 rounded mb-2 cursor-pointer hover:bg-gray-100"
            onClick={joinRoom}
        >
            <h2 className="text-xl font-semibold">{room.name}</h2>
            <p className="text-gray-500">Room ID: {room.id}</p>
        </div>
    );
};

export default RoomCard;
