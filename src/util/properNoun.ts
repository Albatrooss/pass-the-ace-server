export const properNoun = (str: string) => {
    let wordArr = str.split(' ');
    return wordArr
        .map(word => word[0].toUpperCase() + word.substr(1))
        .join(' ');
};
