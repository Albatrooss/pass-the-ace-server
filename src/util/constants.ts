import { Card, GameData } from './types';

export const defaultDeck: Card[] = [
    'sA',
    's02',
    's03',
    's04',
    's05',
    's06',
    's07',
    's08',
    's09',
    's10',
    'sJ',
    'sQ',
    'sK',
    'dA',
    'd02',
    'd03',
    'd04',
    'd05',
    'd06',
    'd07',
    'd08',
    'd09',
    'd10',
    'dJ',
    'dQ',
    'dK',
    'hA',
    'h02',
    'h03',
    'h04',
    'h05',
    'h06',
    'h07',
    'h08',
    'h09',
    'h10',
    'hJ',
    'hQ',
    'hK',
    'cA',
    'c02',
    'c03',
    'c04',
    'c05',
    'c06',
    'c07',
    'c08',
    'c09',
    'c10',
    'cJ',
    'cQ',
    'cK',
];

export const defaultMessage: string = 'Welcome to Pass the Ace!';

export const defaultGameData: GameData = {
    hostId: '',
    gameOn: false,
    users: {},
    deck: [],
    settings: {
        lives: 3,
        jokers: false,
        bus: true,
    },
    order: [],
    dealer: null,
};
