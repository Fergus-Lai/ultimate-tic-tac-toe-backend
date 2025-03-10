import { Server } from "socket.io";
import express from "express";
import { createServer } from "node:http";
import randexp from "randexp";
import { Board, WINNING_COMBINATIONS } from "./board.js";
import { randomInt } from "node:crypto";
import cors from "cors";

const corsOptions = {
    origin: "*",
    methods: ["GET", "POST"],
};

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(cors(corsOptions));

type NulPlayer = 0 | 1 | null;

type Room = {
    players: string[];
    gameBoard: Board[];
    turn: string;
};

const rooms: Map<string, Room> = new Map();

const ROOMID_REGEX = "[A-Z0-9]{6}";

const checkWin = (gameBoard: Board[]) => {
    const player0 = new Set();
    const player1 = new Set();
    for (let i = 0; i < gameBoard.length; i++) {
        if (gameBoard[i].winner == 0) player0.add(i);
        if (gameBoard[i].winner == 1) player1.add(i);
    }
    for (const combination of WINNING_COMBINATIONS) {
        if (combination.isSubsetOf(player0)) return 0;
        if (combination.isSubsetOf(player1)) return 1;
    }
    if (player0.size + player1.size == 9) return 2;
    return null;
};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinGame", ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit("error", { message: "Room does not exist" });
            return;
        }

        if (room.players.length >= 2) {
            socket.emit("error", { message: "Room is full" });
            return;
        }

        room.players.push(socket.id);
        socket.join(roomId);
        if (room.players.length == 2) {
            room.turn =
                room.turn == "" ? room.players[randomInt(2)] : room.turn;
            io.to(roomId).emit("gameStart", {
                roomId,
                players: room.players,
                turn: room.turn,
            });
        }
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("makeMove", ({ roomId, boardIndex, cellIndex }) => {
        let game = rooms.get(roomId);
        if (
            game &&
            game.players.includes(socket.id) &&
            game.turn === socket.id
        ) {
            const symbol = game.players[0] === socket.id ? 0 : 1;

            if (!game.gameBoard[boardIndex].winner) {
                game.gameBoard[boardIndex].cells[cellIndex] = symbol;
                game.gameBoard[boardIndex].checkState();
                game.turn = game.players[symbol == 0 ? 1 : 0]; // Switch turns
                io.to(roomId).emit("updateBoard", {
                    board: game.gameBoard,
                    turn: game.turn,
                });
                const result = checkWin(game.gameBoard);
                if (result) {
                    io.to(roomId).emit("gameOver", { winner: result });
                }
            }
        }
    });

    socket.on("disconnect", () => {
        for (let roomId in rooms) {
            let game = rooms.get(roomId);
            if (game && game.players.includes(socket.id)) {
                io.to(roomId).emit("gameOver", { winner: "Opponent Left" });
                rooms.delete(roomId);
                break;
            }
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});

app.post("/create-room", (req, res) => {
    let roomId = randexp.randexp(ROOMID_REGEX); // Generate room ID
    while (roomId in rooms.keys()) {
        roomId = randexp.randexp(ROOMID_REGEX);
    }
    rooms.set(roomId, {
        players: [],
        gameBoard: Array(9)
            .fill(null)
            .map(() => new Board()),
        turn: "",
    });
    res.json({ roomId });
});

server.listen(3000, () => {
    console.log("server running at http://localhost:3000");
});
