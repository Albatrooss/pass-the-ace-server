"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const shuffle_1 = require("./util/shuffle");
const constants_1 = require("./util/constants");
const properNoun_1 = require("./util/properNoun");
const createChat_1 = require("./util/createChat");
const app = express_1.default();
const httpServer = http_1.createServer(app);
app.use(cors_1.default());
app.get('/', (_, res) => res.send('HELLO WORLD'));
app.get('/ping', (_, res) => {
    console.log('pinging!');
    res.json({ connected: false });
});
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
    },
});
let lobbyData = {};
io.on('connection', socket => {
    let userId = socket.id;
    console.log('Connection made:', userId);
    let username = null;
    let lobbyId = null;
    socket.on('disconnect', () => {
        var _a;
        console.log('Disconnected...', userId);
        if (!lobbyId || !lobbyData[lobbyId])
            return;
        if (username) {
            lobbyData[lobbyId].chat = createChat_1.createChat(lobbyData[lobbyId].chat, '', `${properNoun_1.properNoun(username)} has left the Game`);
            io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
        }
        const userIdIdx = (_a = lobbyData[lobbyId]) === null || _a === void 0 ? void 0 : _a.userIds.findIndex(u => u === userId);
        if (userIdIdx !== -1)
            lobbyData[lobbyId].userIds.splice(userIdIdx, 1);
        const wasHost = lobbyData[lobbyId].gameData.hostId === userId;
        if (wasHost && Object.keys(lobbyData[lobbyId].gameData.users).length) {
            let newHostId = Object.values(lobbyData[lobbyId].gameData.users)[0]
                .id;
            lobbyData[lobbyId].hostId = newHostId;
            lobbyData[lobbyId].gameData.hostId = newHostId;
            lobbyData[lobbyId].chat = createChat_1.createChat(lobbyData[lobbyId].chat, '', `${Object.values(lobbyData[lobbyId].gameData.users)[0].username} is now the host`);
        }
        delete lobbyData[lobbyId].gameData.users[userId];
        if (!lobbyData[lobbyId].userIds.length) {
            delete lobbyData[lobbyId];
            return;
        }
        io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
    });
    socket.on('firstJoin', (data) => {
        console.log('New user to lobby: ', data.lobbyId);
        lobbyId = data.lobbyId;
        socket.join(lobbyId);
        if (data.username) {
            username = data.username;
            if (lobbyData[lobbyId]) {
                console.log('allready a game');
                lobbyData[lobbyId].userIds.push(userId);
                lobbyData[lobbyId].gameData.users[userId] = {
                    id: userId,
                    username,
                    card: null,
                    dealer: false,
                };
                lobbyData[lobbyId].chat = createChat_1.createChat(lobbyData[lobbyId].chat, '', `${properNoun_1.properNoun(username)} has joined the Game`);
                io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
                io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
                return;
            }
            console.log('creating lobby');
            let deck = shuffle_1.shuffle(constants_1.defaultDeck);
            lobbyData[lobbyId] = {
                id: lobbyId,
                hostId: userId,
                userIds: [userId],
                chat: [
                    {
                        username: '',
                        messages: [
                            constants_1.defaultMessage,
                            `${properNoun_1.properNoun(username)} has joined the Game`,
                        ],
                    },
                ],
                gameData: {
                    hostId: userId,
                    users: {
                        [userId]: {
                            id: userId,
                            username,
                            card: null,
                            dealer: false,
                        },
                    },
                    deck,
                    gameOn: false,
                    settings: {
                        lives: 3,
                        jokers: false,
                        bus: true,
                    },
                },
            };
            io.to(userId).emit('game', lobbyData[lobbyId].gameData);
            return;
        }
        if (!lobbyData[lobbyId]) {
            console.log(`Lobby ${lobbyId} not found`);
            io.to(userId).emit('lobbyNotFound');
            return;
        }
        lobbyData[lobbyId].userIds.push(userId);
        io.to(userId).emit('game', lobbyData[lobbyId].gameData);
    });
    socket.on('getGameData', () => {
        if (!lobbyId)
            return;
        io.to(userId).emit('game', lobbyData[lobbyId].gameData);
    });
    socket.on('joinLobby', (uname) => {
        console.log('JOIN LOBBY? lobbyId, uname', lobbyId, uname);
        if (!lobbyId)
            return;
        username = uname;
        if (!Object.values(lobbyData[lobbyId].gameData.users).length) {
            lobbyData[lobbyId].gameData.hostId = userId;
            lobbyData[lobbyId].hostId = userId;
        }
        lobbyData[lobbyId].gameData.users[userId] = {
            id: userId,
            username,
            card: null,
            dealer: false,
        };
        lobbyData[lobbyId].chat = createChat_1.createChat(lobbyData[lobbyId].chat, '', `${properNoun_1.properNoun(username)} has joined the Game`);
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
        io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
    });
    socket.on('leaveLobby', () => {
        if (!lobbyId || !lobbyData[lobbyId])
            return;
        delete lobbyData[lobbyId].gameData.users[userId];
        lobbyData[lobbyId].chat = createChat_1.createChat(lobbyData[lobbyId].chat, '', `${properNoun_1.properNoun(username)} has left the Game`);
        const wasHost = lobbyData[lobbyId].gameData.hostId === userId;
        if (wasHost && Object.keys(lobbyData[lobbyId].gameData.users).length) {
            let newHostId = Object.values(lobbyData[lobbyId].gameData.users)[0]
                .id;
            lobbyData[lobbyId].hostId = newHostId;
            lobbyData[lobbyId].gameData.hostId = newHostId;
            lobbyData[lobbyId].chat = createChat_1.createChat(lobbyData[lobbyId].chat, '', `${properNoun_1.properNoun(Object.values(lobbyData[lobbyId].gameData.users)[0]
                .username)} is now the host`);
        }
        username = null;
        io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
    });
    socket.on('getChat', () => {
        if (!lobbyId || !userId || !lobbyData[lobbyId])
            return;
        io.to(userId).emit('chat', lobbyData[lobbyId].chat);
    });
    socket.on('chat', (text) => {
        console.log('lobbyId, username', lobbyId, username);
        if (!lobbyId || !username)
            return;
        lobbyData[lobbyId].chat = createChat_1.createChat(lobbyData[lobbyId].chat, username, text);
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
    });
});
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log('Server listening on PORT:' + PORT));
//# sourceMappingURL=index.js.map