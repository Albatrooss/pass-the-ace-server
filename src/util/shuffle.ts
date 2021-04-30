export const shuffle = (arr: any[]) => {
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
