import { Server } from 'socket.io';
import express from 'express';
import { createServer } from 'http';
import { Card, JoinData, Lobby } from './util/types';
import { shuffle } from './util/shuffle';
import { defaultDeck, defaultMessage } from './util/constants';
import { properNoun } from './util/properNoun';
import { createChat } from './util/createChat';

const app = express();

const httpServer = createServer(app);

app.get('/', (_, res) => res.send('HELLO WORLD'));

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
            io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
        }

        // REMOVE FROM USERIDS
        const userIdIdx = lobbyData[lobbyId]?.userIds.findIndex(
            u => u === userId,
        );
        if (userIdIdx !== -1) lobbyData[lobbyId].userIds.splice(userIdIdx, 1);

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
                `${
                    Object.values(lobbyData[lobbyId].gameData.users)[0].username
                } is now the host`,
            );
        }

        // REMOVE FROM GAMEDATA USERS
        delete lobbyData[lobbyId].gameData.users[userId];

        // DELETE LOBBY IF EMPTY
        if (!lobbyData[lobbyId].userIds.length) {
            delete lobbyData[lobbyId];
            return;
        }
        io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
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
                    dealer: false,
                };

                lobbyData[lobbyId].chat = createChat(
                    lobbyData[lobbyId].chat,
                    '',
                    `${properNoun(username)} has joined the Game`,
                );
                io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
                io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
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
            dealer: false,
        };
        lobbyData[lobbyId].chat = createChat(
            lobbyData[lobbyId].chat,
            '',
            `${properNoun(username)} has joined the Game`,
        );
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
        io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
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
        io.to(lobbyId).emit('game', lobbyData[lobbyId].gameData);
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
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
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => console.log('Server listening on PORT:' + PORT));
