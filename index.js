const express = require('express');
const tabula = require('tabula-js');
const path = require('path');
const fs = require('fs');

const app = express();

app.get('/', (req, res) => {
    res.send('Get - Working');
});

app.post('/convert', async (req, res) => {
    const pdfDir = './';

    const pdfFiles = fs.readdirSync(pdfDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.pdf'))
        .map(dirent => dirent.name);

    const csvDataArray = [];
    const promises = pdfFiles.map(async (pdfFile) => {
        const pdfPath = path.join(pdfDir, pdfFile);
        const stream = tabula(pdfPath, { pages: "all" }, { area: "80, 30, 1080 , 810" }).streamCsv();
        const fileStream = stream.fork();
        await new Promise((resolve, reject) => {
            let csvData = '';
            fileStream.on('data', chunk => csvData += chunk);
            fileStream.on('end', () => {
                csvDataArray.push(csvData);
                resolve();
            });
            fileStream.on('error', (err) => reject(err));
        });
    });

    try {
        await Promise.all(promises);
        const csvData = csvDataArray.join('');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=merged.csv');
        console.log(csvData);
        res.send(csvData);
    } catch (err) {
        res.status(500).send(`Error occurred while processing PDFs: ${err.message}`);
    }
});

module.exports = app;
// app.listen(process.env.PORT || 3000, () => {
//     console.log(`Server listening on port ${process.env.PORT || 3000}`);
// });
