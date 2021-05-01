"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.properNoun = void 0;
const properNoun = (str) => {
    if (!str)
        return null;
    let wordArr = str.split(' ');
    return wordArr
        .map(word => word[0].toUpperCase() + word.substr(1))
        .join(' ');
};
exports.properNoun = properNoun;
//# sourceMappingURL=properNoun.js.map