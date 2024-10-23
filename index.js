const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

// Folder paths
const inputFolder = './input'; // Folder to monitor
const outputFolder = './output'; // Folder to store the chunks
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunk size

// Track processed files to avoid duplicates
let processedFiles = new Set();

// Function to check the input folder for new files
function checkForNewFiles() {
    fs.readdir(inputFolder, (err, files) => {
        if (err) {
            console.error('Error reading input folder:', err);
            return;
        }
        files.forEach(file => {
            if (!processedFiles.has(file)) {
                const filePath = path.join(inputFolder, file);
                processFile(filePath);
            }
        });
    });
}

// Function to split the file into chunks
function processFile(filePath) {
    const fileName = path.basename(filePath);
    const outputFileBase = path.join(outputFolder, fileName);
    
    // Read the file and split into chunks
    fs.stat(filePath, (err, stats) => {
        if (err) {
            console.error('Error getting file stats:', err);
            return;
        }

        const totalSize = stats.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
        
        const readStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
        let chunkIndex = 0;

        readStream.on('data', (chunk) => {
            const chunkFilePath = `${outputFileBase}-chunk-${chunkIndex}`;
            fs.writeFile(chunkFilePath, chunk, (err) => {
                if (err) {
                    console.error('Error writing chunk file:', err);
                } else {
                    console.log(`Written chunk ${chunkIndex} of file ${fileName}`);
                }
            });
            chunkIndex++;
        });

        readStream.on('end', () => {
            console.log(`File ${fileName} split into ${totalChunks} chunks.`);
            processedFiles.add(fileName);

            // After splitting, concatenate the chunks and validate
            validateFile(filePath, outputFileBase, totalChunks);
        });
    });
}

// Function to concatenate chunks and compare with the original
function validateFile(originalFilePath, outputFileBase, totalChunks) {
    const concatenatedFilePath = `${outputFileBase}-concatenated${path.extname(originalFilePath)}`;
    
    const writeStream = fs.createWriteStream(concatenatedFilePath);

    for (let i = 0; i < totalChunks; i++) {
        const chunkFilePath = `${outputFileBase}-chunk-${i}`;
        const chunk = fs.readFileSync(chunkFilePath);
        writeStream.write(chunk);
    }

    writeStream.end(() => {
        console.log(`Chunks concatenated to ${concatenatedFilePath}`);
        compareFiles(originalFilePath, concatenatedFilePath);
    });
}

// Function to compare the original file with the concatenated file
function compareFiles(originalFile, concatenatedFile) {
    const originalBuffer = fs.readFileSync(originalFile);
    const concatenatedBuffer = fs.readFileSync(concatenatedFile);

    if (Buffer.compare(originalBuffer, concatenatedBuffer) === 0) {
        console.log('Files are identical. No data loss.');
    } else {
        console.error('Files do not match. Data might be lost.');
    }
}

// Check for new files every 8 sec
setInterval(checkForNewFiles, 8000); //
