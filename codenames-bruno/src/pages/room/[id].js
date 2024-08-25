import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import words from "../../resources/words.json";

const generateBoard = (words) => {
    // Defina a quantidade específica de cada tipo de carta
    const cardCounts = {
        red: 9,
        blue: 8,
        gray: 7,
        black: 1,
    };

    // Verifique se há pelo menos 25 palavras
    if (words.length < 25) {
        throw new Error('O array de palavras deve conter pelo menos 25 palavras.');
    }

    // Embaralhe as palavras e selecione 25 únicas
    const shuffledWords = words.sort(() => Math.random() - 0.5).slice(0, 25);

    // Crie uma lista de cartões com base nas contagens específicas
    const cards = [
        ...Array(cardCounts.red).fill({ category: 'red' }),
        ...Array(cardCounts.blue).fill({ category: 'blue' }),
        ...Array(cardCounts.gray).fill({ category: 'neutral' }),
        { category: 'black' }
    ];

    // Embaralhe os cartões
    const shuffledCards = cards.sort(() => Math.random() - 0.5);

    // Crie o tabuleiro 5x5 usando os cartões embaralhados
    const board = [];
    for (let i = 0; i < 5; i++) {
        board.push(shuffledCards.slice(i * 5, i * 5 + 5).map((card, index) => ({
            word: shuffledWords[i * 5 + index],
            revealed: false,
            category: card.category,
        })));
    }
    
    return board;
};



const Room = () => {
    const router = useRouter();
    const { id: roomId } = router.query;
    const [board, setBoard] = useState([]);
    const [playerColor, setPlayerColor] = useState('');
    const [players, setPlayers] = useState({});
    const [socket, setSocket] = useState(null);
    const [gameStatus, setGameStatus] = useState('playing');
    const [blackWordRevealed, setBlackWordRevealed] = useState(false);
    const [isSpymaster, setIsSpymaster] = useState(false);
    const [revealedBySpymaster, setRevealedBySpymaster] = useState(false);
    const [redCardsRemaining, setRedCardsRemaining] = useState(0);
    const [blueCardsRemaining, setBlueCardsRemaining] = useState(0);
    const [isRevealedAll, setIsRevealedAll] = useState(false); // Novo estado
    const [clickedByOthers, setClickedByOthers] = useState([]);
    const [clickedCard, setClickedCard] = useState(null);


    useEffect(() => {
      if (!roomId) return;
  
      const socketInstance = io('https://hilarious-fishy-handle.glitch.me/', {
          transports: ['websocket', 'polling'],
      });
  
      setSocket(socketInstance);
  
      socketInstance.on('connect', () => {
          console.log('Socket connected:', socketInstance.id);
          socketInstance.emit('join-room', roomId);
      });
  
      socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
      });
  
      // O restante do código de configuração do socket
  
      return () => {
          socketInstance.disconnect();
      };
  }, [roomId]);
  
  
    useEffect(() => {
        const countCards = () => {
            let redCount = 0;
            let blueCount = 0;

            board.forEach(row => {
                row.forEach(cell => {
                    if (cell && !cell.revealed) {
                        if (cell.category === 'red') redCount++;
                        else if (cell.category === 'blue') blueCount++;
                    }
                });
            });

            setRedCardsRemaining(redCount);
            setBlueCardsRemaining(blueCount);
        };

        countCards();
    }, [board]);
    useEffect(() => {
      console.log('useEffect running');
  
      if (socket) {
          console.log('Socket is initialized:', socket);
  
          socket.on('card-clicked', (data) => {
              console.log('Card clicked event received on client:', data);
              // Atualize o estado com os dados recebidos
          });
  
          return () => {
              if (socket) {
                  console.log('Cleaning up event listener');
                  socket.off('card-clicked');
              }
          };
      }
  }, [socket]);
  
  
  
    const handleRevealAllClick = () => {
        // Alterna o estado revealedBySpymaster
        setRevealedBySpymaster(!revealedBySpymaster);
        
        // Emite o evento para todos os jogadores na sala
        if (socket) {
            socket.emit('reveal-all-clicked', roomId);
        }
    };
    
    
    const handleCellClick = (row, col) => {
      if (gameStatus !== 'playing' || blackWordRevealed) return;
  
      const clickedCell = board[row][col];
      if (clickedCell.revealed) return;
  
      const newBoard = board.map((rowArr, rowIndex) =>
          rowArr.map((cell, colIndex) => {
              if (rowIndex === row && colIndex === col && cell && !cell.revealed) {
                  return { ...cell, revealed: true };
              }
              return cell;
          })
      );
  
      let updatedGameStatus = gameStatus;
      let updatedBlackWordRevealed = blackWordRevealed;
  
      if (clickedCell.category === 'black') {
          updatedGameStatus = 'lost';
          updatedBlackWordRevealed = true;
      }
  
      setBoard(newBoard);
      setGameStatus(updatedGameStatus);
      setBlackWordRevealed(updatedBlackWordRevealed);
      setClickedCard({ row, col }); // Atualize o estado do card clicado
  
      if (socket) {
          socket.emit('card-clicked', {
              roomId,
              cardPosition: { row, col }
          });
          socket.emit('update-board', {
              roomId,
              board: newBoard,
              gameStatus: updatedGameStatus,
              blackWordRevealed: updatedBlackWordRevealed
          });
      }
  };
  
  
  
    const handleResetGame = () => {
      const newBoard = generateBoard(words);
      setBoard(newBoard);
      setGameStatus('playing');
      setBlackWordRevealed(false);
      setRedCardsRemaining(9);
      setBlueCardsRemaining(8);
  
      if (socket) {
          socket.emit("reset-board", roomId, newBoard, 'playing', 9, 8);
      }
  };
  

    return (
      <div className="p-0 md:p-4 h-screen w-screen">
        <div className="flex flex-col md:flex-row w-screen gap-x-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold mb-4">
              Room: {roomId || "Loading..."}
            </h1>
            <h2 className="text-lg">
              Game Status:{" "}
              {gameStatus === "playing" ? (
                <span className="text-emerald-400 font-bold">In Progress</span>
              ) : (
                <span className="text-[#f87171] font-bold">Game Over</span>
              )}
            </h2>
            <p className="text-[#f87171] font-bold">
              Red Cards Remaining: {redCardsRemaining}
            </p>
            <p className="text-[#60a5fa] font-bold">
              Blue Cards Remaining: {blueCardsRemaining}
            </p>
            <div className="flex gap-x-2 mt-1">
              <button
                onClick={handleRevealAllClick}
                className="bg-[#60a5fa] hover:bg-[#147af8] transition ease-in px-4 text-white rounded h-8"
              >
                Spymaster
              </button>
              <button
                onClick={handleResetGame}
                className="bg-[#f87171] hover:bg-[#f42727] transition ease-in px-4 text-white rounded h-8"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="w-full h-full flex justify-center items-center mr-60 mt-20 md:mt-0">
            {board.length > 0 ? (
              <div className="grid grid-cols-5 gap-2 md:gap-5">
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
<div
    key={`${rowIndex}-${colIndex}`}
    onClick={() => handleCellClick(rowIndex, colIndex)}
    className={`w-16 md:w-32 h-16 md:h-32 perspective hover:scale-110 transition-all ease-in ${
        (clickedCard && clickedCard.row === rowIndex && clickedCard.col === colIndex && !revealedBySpymaster)
        ? 'border-4 border-yellow-500'
        : ''
    }`}
>
    <div
        className={`w-full h-full relative transform-style-preserve-3d transition-transform duration-500 ${
            cell.revealed || revealedBySpymaster ? 'rotate-y-180' : ''
        }`}
    >
        <div
            className={`absolute w-full h-full backface-hidden flex items-center justify-center border border-gray-300 cursor-pointer rounded ${
                cell.revealed || revealedBySpymaster ? getCellColor(cell.category) : 'bg-white'
            }`}
        >
            <span
                className={`text-lg ${
                    cell.revealed || revealedBySpymaster
                        ? cell.category === 'black'
                            ? 'text-white font-bold absolute bottom-0 text-xs md:text-base'
                            : 'text-white font-bold text-xs md:text-base'
                        : 'text-gray-800 font-bold text-xs md:text-base'
                }`}
            >
                {cell.word.charAt(0).toUpperCase() + cell.word.slice(1)}
            </span>
        </div>
        <div
            className={`absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center border border-gray-300 cursor-pointer rounded ${
                cell.revealed || revealedBySpymaster ? getCellColor(cell.category) : 'bg-white font-bold'
            }`}
        >
            <div
                className={`absolute bottom-0 w-full h-5 md:h-10 ${
                    (cell.revealed || revealedBySpymaster) && 'bg-gradient-to-t from-black'
                }`}
            ></div>
            <span
                className={`text-lg ${
                    cell.revealed || revealedBySpymaster
                        ? cell.category === 'black'
                            ? 'text-white font-bold absolute bottom-0 text-xs md:text-base'
                            : 'text-white absolute bottom-0 rounded-lg px-2 opacity-70 font-bold text-xs md:text-base'
                        : 'text-gray-800 font-bold text-xs md:text-base'
                }`}
            >
                {cell.word.charAt(0).toUpperCase() + cell.word.slice(1)}
            </span>
        </div>
    </div>
</div>


                  ))
                )}
              </div>
            ) : (
              <p>Loading board...</p>
            )}
          </div>
        </div>
      </div>
    );
};

const getCellColor = (category) => {
    switch (category) {
        case "red":
            return "bg-[url('/images/redCard.png')] bg-cover bg-no-repeat bg-center";
        case "blue":
            return "bg-[url('/images/blueCard2.png')] bg-cover bg-no-repeat bg-center";
        case "black":
            return "bg-[url('/images/deathCard.png')] bg-cover bg-no-repeat bg-center";
        default:
            return "bg-[url('/images/grayCard.jpg')] bg-cover bg-no-repeat bg-center";
    }
};

export default Room;
