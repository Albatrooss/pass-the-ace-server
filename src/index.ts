import { Server } from 'socket.io';
import { createServer } from 'http';
import { Card, JoinData, Lobby } from './util/types';
import { shuffle } from './util/shuffle';
import { defaultDeck, defaultMessage } from './util/constants';
import { properNoun } from './util/properNoun';

const httpServer = createServer();

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
        const userIdIdx = lobbyData[lobbyId]?.userIds.findIndex(
            u => u === userId,
        );
        console.log('username,', username);
        if (username) {
            lobbyData[lobbyId].chat = [
                {
                    username: '',
                    messages: [`${properNoun(username)} has left the Game`],
                },
                ...lobbyData[lobbyId].chat,
            ];
            io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
        }
        if (userIdIdx !== -1) lobbyData[lobbyId].userIds.splice(userIdIdx, 1);
        const userIdx = lobbyData[lobbyId].gameData.users.findIndex(
            u => u.id === userId,
        );
        if (userIdx !== -1) {
            const wasHost = lobbyData[lobbyId].gameData.hostId === userId;
            lobbyData[lobbyId].gameData.users.splice(userIdx, 1);
            if (wasHost && lobbyData[lobbyId].gameData.users.length) {
                let newHostId = lobbyData[lobbyId].gameData.users[0].id;
                lobbyData[lobbyId].hostId = newHostId;
                lobbyData[lobbyId].gameData.hostId = newHostId;
                lobbyData[lobbyId].chat = [
                    {
                        username: '',
                        messages: [
                            `${lobbyData[lobbyId].gameData.users[0].username} is now the host`,
                        ],
                    },
                    ...lobbyData[lobbyId].chat,
                ];
            }
        }
        if (!lobbyData[lobbyId].userIds.length) {
            delete lobbyData[lobbyId];
            return;
        }
        io.to(lobbyId).emit('gameUpdate', lobbyData[lobbyId].gameData);
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
                lobbyData[lobbyId].gameData.users.push({
                    id: userId,
                    username,
                    card: null,
                    dealer: false,
                });
                lobbyData[lobbyId].chat = [
                    {
                        username: '',
                        messages: [
                            `${properNoun(username)} has joined the Game`,
                        ],
                    },
                    ...lobbyData[lobbyId].chat,
                ];
                io.to(lobbyId).emit('gameUpdate', lobbyData[lobbyId].gameData);
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
                            `${properNoun(username)} has joined the Game`,
                        ],
                    },
                    defaultMessage,
                ],
                gameData: {
                    hostId: userId,
                    users: [
                        {
                            id: userId,
                            username,
                            card: null,
                            dealer: false,
                        },
                    ],
                    deck,
                    gameOn: false,
                    settings: {
                        lives: 3,
                        jokers: false,
                        bus: true,
                    },
                },
            };
            io.to(userId).emit('gameUpdate', lobbyData[lobbyId].gameData);
            return;
        }
        if (!lobbyData[lobbyId]) {
            console.log(`Lobby ${lobbyId} not found`);
            io.to(userId).emit('lobbyNotFound');
            return;
        }
        lobbyData[lobbyId].userIds.push(userId);
        io.to(userId).emit('gameUpdate', lobbyData[lobbyId].gameData);
    });

    socket.on('getGameData', () => {
        if (!lobbyId) return; //TODO
        io.to(userId).emit('gameUpdate', lobbyData[lobbyId].gameData);
    });

    socket.on('joinLobby', (uname: string) => {
        console.log('JOIN LOBBY? lobbyId, uname', lobbyId, uname);
        if (!lobbyId) return; //TODO
        username = uname;
        if (!lobbyData[lobbyId].gameData.users.length) {
            lobbyData[lobbyId].gameData.hostId = userId;
            lobbyData[lobbyId].hostId = userId;
        }
        lobbyData[lobbyId].gameData.users.push({
            id: userId,
            username,
            card: null,
            dealer: false,
        });
        lobbyData[lobbyId].chat = [
            {
                username: '',
                messages: [`${properNoun(username)} has joined the Game`],
            },
            ...lobbyData[lobbyId].chat,
        ];
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
        io.to(lobbyId).emit('gameUpdate', lobbyData[lobbyId].gameData);
    });

    socket.on('getChat', () => {
        if (!lobbyId || !userId || !lobbyData[lobbyId]) return; //TODO
        io.to(userId).emit('chat', lobbyData[lobbyId].chat);
    });

    socket.on('chat', (text: string) => {
        console.log('lobbyId, username', lobbyId, username);
        if (!lobbyId || !username) return; //TODO
        if (lobbyData[lobbyId].chat[0].username === username) {
            lobbyData[lobbyId].chat[0].messages.push(text);
        } else {
            lobbyData[lobbyId].chat = [
                { username, messages: [text] },
                ...lobbyData[lobbyId].chat,
            ];
        }
        io.to(lobbyId).emit('chat', lobbyData[lobbyId].chat);
    });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => console.log('Server listening on PORT:' + PORT));
