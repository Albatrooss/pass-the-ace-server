import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Card, JoinData, Lobby } from './util/types';
import { shuffle } from './util/shuffle';
import { defaultDeck, defaultMessage } from './util/constants';
import { properNoun } from './util/properNoun';
import { createChat } from './util/createChat';

const app = express();

const httpServer = createServer(app);

app.use(cors());

app.get('/', (_, res) => res.send('HELLO WORLD'));

app.get('/ping', (_, res) => {
    res.json({ connected: true });
});

const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});

let lobbyData: { [lobbyId: string]: Lobby } = {};

io.on('connection', socket => {
    let userId = socket.id;
    console.log('Connection made:', userId);
    let username: string | null = null;
    let lobbyId: string | null = null;

    socket.on('disconnect', () => {
        console.log('Disconnected...', userId);
        if (!lobbyId || !lobbyData[lobbyId]) return;

        // SEND USER LEFT CHAT
        if (username) {
            lobbyData[lobbyId].chat = createChat(
                lobbyData[lobbyId].chat,
                '',
                `${properNoun(username)} has left the Game`,
            );
            sendChat(lobbyId);
        }

        // REMOVE FROM USERIDS
        const userIdIdx = lobbyData[lobbyId]?.userIds.findIndex(
            u => u === userId,
        );
        if (userIdIdx !== -1) lobbyData[lobbyId].userIds.splice(userIdIdx, 1);

        // CHECK IF HOST NEEDS TO CHANGE
        const wasHost = lobbyData[lobbyId].gameData.hostId === userId;
        // REMOVE FROM GAMEDATA USERS
        delete lobbyData[lobbyId].gameData.users[userId];
        if (wasHost && Object.keys(lobbyData[lobbyId].gameData.users).length) {
            let newHostId = Object.values(lobbyData[lobbyId].gameData.users)[0]
                .id;
            lobbyData[lobbyId].hostId = newHostId;
            lobbyData[lobbyId].gameData.hostId = newHostId;

            lobbyData[lobbyId].chat = createChat(
                lobbyData[lobbyId].chat,
                '',
                `${properNoun(
                    Object.values(lobbyData[lobbyId].gameData.users)[0]
                        .username,
                )} is now the host`,
            );
            sendChat(lobbyId);
        }

        // DELETE LOBBY IF EMPTY
        if (!lobbyData[lobbyId].userIds.length) {
            delete lobbyData[lobbyId];
            return;
        }
        sendGame(lobbyId);
    });

    socket.on('firstJoin', (data: JoinData) => {
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
                };

                lobbyData[lobbyId].chat = createChat(
                    lobbyData[lobbyId].chat,
                    '',
                    `${properNoun(username)} has joined the Game`,
                );
                sendGame(lobbyId);
                sendChat(lobbyId);
                return;
            }
            console.log('creating lobby');
            let deck: Card[] = shuffle(defaultDeck);

            lobbyData[lobbyId] = {
                id: lobbyId,
                hostId: userId,
                userIds: [userId],
                chat: [
                    {
                        username: '',
                        messages: [
                            defaultMessage,
                            `${properNoun(username)} has joined the Game`,
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
                        },
                    },
                    deck,
                    gameOn: false,
                    settings: {
                        lives: 3,
                        jokers: false,
                        bus: true,
                    },
                    order: [],
                    dealer: null,
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
        if (!lobbyId) return; //TODO
        io.to(userId).emit('game', lobbyData[lobbyId].gameData);
    });

    socket.on('joinLobby', (uname: string) => {
        console.log('JOIN LOBBY? lobbyId, uname', lobbyId, uname);
        if (!lobbyId) return; //TODO
        username = uname;
        if (!Object.values(lobbyData[lobbyId].gameData.users).length) {
            lobbyData[lobbyId].gameData.hostId = userId;
            lobbyData[lobbyId].hostId = userId;
        }
        lobbyData[lobbyId].gameData.users[userId] = {
            id: userId,
            username,
            card: null,
        };
        lobbyData[lobbyId].chat = createChat(
            lobbyData[lobbyId].chat,
            '',
            `${properNoun(username)} has joined the Game`,
        );
        sendChat(lobbyId);
        sendGame(lobbyId);
    });

    socket.on('leaveLobby', () => {
        if (!lobbyId || !lobbyData[lobbyId]) return; //TODO;
        delete lobbyData[lobbyId].gameData.users[userId];

        lobbyData[lobbyId].chat = createChat(
            lobbyData[lobbyId].chat,
            '',
            `${properNoun(username)} has left the Game`,
        );

        // CHECK IF HOST NEEDS TO CHANGE
        const wasHost = lobbyData[lobbyId].gameData.hostId === userId;
        if (wasHost && Object.keys(lobbyData[lobbyId].gameData.users).length) {
            let newHostId = Object.values(lobbyData[lobbyId].gameData.users)[0]
                .id;
            lobbyData[lobbyId].hostId = newHostId;
            lobbyData[lobbyId].gameData.hostId = newHostId;
            lobbyData[lobbyId].chat = createChat(
                lobbyData[lobbyId].chat,
                '',
                `${properNoun(
                    Object.values(lobbyData[lobbyId].gameData.users)[0]
                        .username,
                )} is now the host`,
            );
        }

        username = null;
        sendGame(lobbyId);
        sendChat(lobbyId);
    });

    socket.on('getChat', () => {
        if (!lobbyId || !userId || !lobbyData[lobbyId]) return; //TODO
        io.to(userId).emit('chat', lobbyData[lobbyId].chat);
    });

    socket.on('chat', (text: string) => {
        console.log('lobbyId, username', lobbyId, username);
        if (!lobbyId || !username) return; //TODO
        lobbyData[lobbyId].chat = createChat(
            lobbyData[lobbyId].chat,
            username,
            text,
        );
        sendChat(lobbyId);
    });

    socket.on('startGame', () => {
        if (!lobbyId) return; //TODO
        let gameData = lobbyData[lobbyId].gameData;
        gameData.gameOn = true;
        gameData.order = shuffle(
            Object.keys(lobbyData[lobbyId].gameData.users),
        );
        gameData.dealer = lobbyData[lobbyId].gameData.order[0];

        // DEAL CARDS
        gameData.order.forEach(uId => {
            if (!gameData.deck.length) return; //TODO
            let card: Card = gameData.deck.pop() as Card;
            gameData.users[uId].card = card;
        });
        lobbyData[lobbyId].gameData = gameData;
        sendGame(lobbyId);
    });

    function sendChat(lobbyId: string) {
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
    }

    function sendGame(lobbyId: string) {
        io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
    }
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => console.log('Server listening on PORT:' + PORT));
