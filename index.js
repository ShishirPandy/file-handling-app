const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

// Folder paths
const inputFolder = './input'; // Folder to monitor
const outputFolder = './output'; // Folder to store the chunks
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunk size

// Track processed files to avoid duplicates
let processedFiles = new Set();

// Extensions for text files (you can add more based on your needs)
const textFileExtensions = ['.txt', '.json', '.csv', '.html', '.xml', '.md', '.js', '.css'];

// Function to check if a file is a text file based on its extension
function isTextFile(fileExtension) {
    return textFileExtensions.includes(fileExtension.toLowerCase());
}

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
    const fileExtension = path.extname(filePath);
    const outputFileBase = path.join(outputFolder, fileName);

    // Determine if the file is text or binary based on its extension
    const isText = isTextFile(fileExtension);

    // Read the file and split into chunks
    fs.stat(filePath, (err, stats) => {
        if (err) {
            console.error('Error getting file stats:', err);
            return;
        }

        const totalSize = stats.size;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

        // Use the appropriate encoding for text or binary files
        const readStreamOptions = isText ? { encoding: 'utf8', highWaterMark: CHUNK_SIZE } : { highWaterMark: CHUNK_SIZE };
        const readStream = fs.createReadStream(filePath, readStreamOptions);
        
        let chunkIndex = 0;

        readStream.on('data', (chunk) => {
            const chunkFilePath = `${outputFileBase}-chunk-${chunkIndex}`;
            // Write with the correct encoding for text or binary
            const writeOptions = isText ? { encoding: 'utf8' } : undefined;
            fs.writeFile(chunkFilePath, chunk, writeOptions, (err) => {
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
            validateFile(filePath, outputFileBase, totalChunks, isText);
        });
    });
}

// Function to concatenate chunks and compare with the original
function validateFile(originalFilePath, outputFileBase, totalChunks, isText) {
    const concatenatedFilePath = `${outputFileBase}-concatenated${path.extname(originalFilePath)}`;

    const writeStreamOptions = isText ? { encoding: 'utf8' } : undefined;
    const writeStream = fs.createWriteStream(concatenatedFilePath, writeStreamOptions);

    for (let i = 0; i < totalChunks; i++) {
        const chunkFilePath = `${outputFileBase}-chunk-${i}`;
        // Read the chunks with the correct encoding for text or binary
        const readOptions = isText ? { encoding: 'utf8' } : undefined;
        const chunk = fs.readFileSync(chunkFilePath, readOptions);
        writeStream.write(chunk);
    }

    writeStream.end(() => {
        console.log(`Chunks concatenated to ${concatenatedFilePath}`);
        compareFiles(originalFilePath, concatenatedFilePath, isText);
    });
}

// Function to compare the original file with the concatenated file
function compareFiles(originalFile, concatenatedFile, isText) {
    // Use correct encoding when reading the original and concatenated files
    const originalBuffer = fs.readFileSync(originalFile, isText ? { encoding: 'utf8' } : undefined);
    const concatenatedBuffer = fs.readFileSync(concatenatedFile, isText ? { encoding: 'utf8' } : undefined);

    // Use Buffer.compare for binary and direct string comparison for text
    const areFilesIdentical = isText
        ? originalBuffer === concatenatedBuffer
        : Buffer.compare(originalBuffer, concatenatedBuffer) === 0;

    if (areFilesIdentical) {
        console.log('Files are identical. No data loss.');
    } else {
        console.error('Files do not match. Data might be lost.');
    }
}

// Check for new files every 8 seconds
setInterval(checkForNewFiles, 8000); // 8 seconds in milliseconds
