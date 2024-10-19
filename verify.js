const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'output');

// Synchronous MD5 calculation function
function calculateMD5Sync(filePath) {
  const hash = createHash('md5');
  const fileData = fs.readFileSync(filePath);  // Read the entire file synchronously
  hash.update(fileData);
  return hash.digest('hex');
}

// Function to concatenate the file chunks and verify integrity synchronously
function verifyFileIntegritySync(filePath) {
  try {
    const fileName = path.basename(filePath);
    const concatenatedFile = path.join(outputDir, `concatenated_${fileName}`);
    
    // Find the chunks in the output directory
    const chunkFiles = fs.readdirSync(outputDir).filter(f => f.startsWith(`${fileName}_chunk_`));

    // Write chunks synchronously to the concatenated file
    const writeStream = fs.openSync(concatenatedFile, 'w');

    chunkFiles.forEach(chunkFile => {
      const chunkPath = path.join(outputDir, chunkFile);
      const chunkData = fs.readFileSync(chunkPath); // Read each chunk synchronously
      fs.writeSync(writeStream, chunkData); // Write chunk to concatenated file synchronously
    });

    fs.closeSync(writeStream); // Close the concatenated file after writing all chunks

    // Calculate MD5 hashes of the original and concatenated files synchronously
    const originalHash = calculateMD5Sync(filePath);
    const concatenatedHash = calculateMD5Sync(concatenatedFile);

    // Compare the hashes
    if (originalHash === concatenatedHash) {
      console.log('File integrity verified, no data loss.');
    } else {
      throw new Error('Data mismatch detected after splitting.');
    }

  } catch (error) {
    console.error(`Error verifying file integrity: ${error.message}`);
    throw error;
  }
}

module.exports = { verifyFileIntegritySync };
