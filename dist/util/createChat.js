"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChat = void 0;
const createChat = (oldChat, username, text) => {
    let returnVal;
    if (oldChat[0].username === username) {
        oldChat[0].messages.push(text);
        returnVal = oldChat;
    }
    else {
        returnVal = [
            { username: username || '', messages: [text] },
            ...oldChat,
        ];
    }
    return returnVal;
};
exports.createChat = createChat;
//# sourceMappingURL=createChat.js.map