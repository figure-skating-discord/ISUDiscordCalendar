function loadingBar(current, max) {
    const progress = Math.floor((current/max) * 10);
    let progString = '';
    for(let i = 0; i < 10; i++) {
        if (i < progress) progString += '▮';
        else progString += '▯';
    }
    //console.log('progress string:', progString)
    return progString;
}

module.exports = { loadingBar }