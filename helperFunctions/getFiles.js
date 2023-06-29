const fs = require('node:fs');

function getFiles(dir, ext) {
    //console.log('dir from get files:', dir)
    const files = fs.readdirSync(dir, {
        withFileTypes: true
    });
    let targetFiles = [];

    for (const file of files) {
        if (file.isDirectory()) {
            targetFiles = [
                ...targetFiles,
                ...getFiles(`${dir}/${file.name}`)
            ]
        } else if (file.name.endsWith(`.${ext}`)) {
            targetFiles.push(`${dir}/${file.name}`)
        }
    }
    return targetFiles;
}

module.exports = { getFiles }