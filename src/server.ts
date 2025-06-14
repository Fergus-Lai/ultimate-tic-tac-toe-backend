import { Server } from "socket.io";
import express from "express";
import { createServer } from "node:http";
import randexp from "randexp";
import { Board, WINNING_COMBINATIONS } from "./board.js";
import { randomInt } from "node:crypto";
import cors from "cors";

const corsOptions = {
    origin:
        process.env.NODE_ENV == "production"
            ? "https://utt.fergus-lai.dev"
            : "*",
    methods: ["GET", "POST"],
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: corsOptions,
});

const port = process.env.PORT || 3000;

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

    socket.on("joinGame", ({ roomID }) => {
        const room = rooms.get(roomID);
        if (!room) {
            socket.emit("error", { message: "Room does not exist" });
            return;
        }

        if (room.players.length >= 2) {
            socket.emit("error", { message: "Room is full" });
            return;
        }

        room.players.push(socket.id);
        socket.join(roomID);
        if (room.players.length == 2) {
            room.turn =
                room.turn == "" ? room.players[randomInt(2)] : room.turn;
            io.to(roomID).emit("gameStart", {
                board: room.gameBoard,
                turn: room.turn,
                activeBoard: null,
            });
        }
        console.log(`User ${socket.id} joined room ${roomID}`);
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
                    activeBoard:
                        game.gameBoard[cellIndex].winner == null
                            ? cellIndex
                            : null,
                });
                const result = checkWin(game.gameBoard);
                if (result !== null) {
                    const winning_player =
                        result == 2 ? "draw" : game.players[result];
                    io.to(roomId).emit("gameOver", { winner: winning_player });
                }
            }
        }
    });

    socket.on("disconnect", () => {
        for (let roomId of rooms.keys()) {
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

app.get("/status", (req, res) => {
    res.status(200).send();
});

server.listen(port, () => {
    console.log("server running at http://localhost:3000");
});
