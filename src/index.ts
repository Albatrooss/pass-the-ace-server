import { Server } from 'socket.io';
import { createServer } from 'http';
import { Card, JoinData, Lobby } from './util/types';
import { shuffle } from './util/shuffle';
import { defaultDeck, defaultMessage } from './util/constants';

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
        if (!lobbyId) return;
        const userIdx = lobbyData[lobbyId].userIds.findIndex(u => u === userId);
        if (userIdx !== -1) lobbyData[lobbyId].userIds.splice(userIdx, 1);
        if (!lobbyData[lobbyId].userIds.length) delete lobbyData[lobbyId];
    });

    socket.on('firstJoin', (data: JoinData) => {
        console.log('New user to lobby: ', data.lobbyId);
        lobbyId = data.lobbyId;
        socket.join(lobbyId);
        if (data.username) {
            console.log('creating lobby');
            username = data.username;
            let deck: Card[] = shuffle(defaultDeck);

            lobbyData[lobbyId] = {
                id: lobbyId,
                hostId: userId,
                userIds: [userId],
                chat: [defaultMessage],
                gameData: {
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
                },
            };
            return;
        }
        if (!lobbyData[lobbyId]) {
            console.log(`Lobby ${lobbyId} not found`);
            io.to(userId).emit('roomNotFound');
            return;
        }
        lobbyData[lobbyId].userIds.push(userId);
        io.to(userId).emit('gameUpdate', lobbyData[lobbyId].gameData);
    });

    socket.on('getGameData', () => {
        if (!lobbyId) return; //TODO
        io.to(userId).emit('gameUpdate', lobbyData[lobbyId].gameData);
    });

    socket.on('joinGame', (uname: string) => {
        if (!lobbyId) return; //TODO
        username = uname;
        lobbyData[lobbyId].gameData.users.push({
            id: userId,
            username,
            card: null,
            dealer: false,
        });
        io.to(lobbyId).emit('gameUpdate', lobbyData[lobbyId].gameData);
    });

    socket.on('getChat', () => {
        if (!lobbyId) return; //TODO
        io.to(userId).emit('chat', lobbyData[lobbyId].chat);
    });

    socket.on('chat', (text: string) => {
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

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => console.log('Server listening on PORT:' + PORT));
