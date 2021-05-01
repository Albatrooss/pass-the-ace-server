import { MessageGrp } from './types';

export const createChat = (
    oldChat: MessageGrp[],
    username: string | null,
    text: string,
): MessageGrp[] => {
    let returnVal: MessageGrp[];
    if (oldChat[0].username === username) {
        oldChat[0].messages.push(text);
        returnVal = oldChat;
    } else {
        returnVal = [
            { username: username || '', messages: [text] },
            ...oldChat,
        ];
    }

    return returnVal;
};
