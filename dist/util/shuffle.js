"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffle = void 0;
const shuffle = (arr) => {
    let currentIdx = arr.length;
    while (currentIdx !== 0) {
        let randomIdx = Math.floor(Math.random() * currentIdx);
        currentIdx--;
        let temp = arr[currentIdx];
        arr[currentIdx] = arr[randomIdx];
        arr[randomIdx] = temp;
    }
    return arr;
};
exports.shuffle = shuffle;
//# sourceMappingURL=shuffle.js.map