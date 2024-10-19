const chokidar = require('chokidar');
const fs = require('fs-extra');
const { createHash } = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');
const { finished } = require('stream'); // To ensure stream finishes properly

const inputDir = path.join(__dirname, 'input');
const outputDir = path.join(__dirname, 'output');

fs.ensureDirSync(inputDir);
fs.ensureDirSync(outputDir);

const processedFiles = new Set();

// Set up email transporter for notifications
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'abhi987012@gmail.com',   // Your Gmail address
    pass: 'kvoc onvv syem mwox'     // Your Gmail password or app-specific password
  }
});

// Send an email notification when file processing is complete
async function sendEmailNotification(fileName) {
  const mailOptions = {
    from: 'abhi987012@gmail.com',
    to: 'shishir18pandey@gmail.com',   // Recipient email address
    subject: 'File Processing Complete',
    text: `The file ${fileName} has been successfully processed.`
  };

   try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);  // Log the success response
  } catch (error) {
    console.log(`Error sending email: ${error.message}`);  // Log the error
    throw error;
  }
}

// Watch for new files in the input directory
chokidar.watch(inputDir, {
  persistent: true,
  usePolling: true,
  interval: 15000
}).on('add', async (filePath) => {
  console.log(`File detected: ${filePath}`);
  const fileName = path.basename(filePath);

  if (processedFiles.has(fileName)) {
    return console.log(`File already processed: ${fileName}`);
  }

  try {
    console.log(`Starting processing of ${fileName}`);
    await sendEmailNotification(fileName); // Send an initial notification
    await processFile(filePath); // Process file: split, verify, etc.
    console.log(`Processing complete for ${fileName}`);
  } catch (error) {
    console.error(`Error processing file ${fileName}:`, error);
  }
});

// Function to split the file into 10MB chunks
async function splitFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const chunkSize = 10 * 1024 * 1024;
    const outputFilePattern = path.join(outputDir, `${fileName}_chunk_`);

    const fileStats = await fs.stat(filePath);
    const totalSize = fileStats.size;
    let bytesRead = 0;
    let chunkIndex = 0;

    const fileDescriptor = await fs.open(filePath, 'r');

    while (bytesRead < totalSize) {
      const buffer = Buffer.alloc(Math.min(chunkSize, totalSize - bytesRead));
      const { bytesRead: read } = await fs.read(fileDescriptor, buffer, 0, buffer.length, bytesRead);
      const chunkFileName = `${outputFilePattern}${chunkIndex}`;
      await fs.writeFile(chunkFileName, buffer);
      console.log(`Written chunk ${chunkIndex}`);
      bytesRead += read;
      chunkIndex++;
    }

    await fs.close(fileDescriptor);
    console.log(`File ${fileName} split into chunks.`);
  } catch (error) {
    console.error(`Error splitting file: ${error.message}`);
    throw error;
  }
}

// Function to calculate the MD5 hash of a file
function calculateMD5(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    fs.createReadStream(filePath)
      .on('data', (data) => hash.update(data))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

// Function to concatenate the file chunks and verify file integrity
// Ensure this is already imported at the top

// Function to concatenate the file chunks and verify file integrity
async function verifyFileIntegrity(filePath) {
  try {
   
    const fileName = path.basename(filePath);
    const concatenatedFile = path.join(outputDir, `concatenated_${fileName}`);

    const chunkFiles = fs.readdirSync(outputDir).filter(f => f.startsWith(`${fileName}_chunk_`));
    const writeStream = fs.createWriteStream(concatenatedFile);
    

    // Concatenate all chunks into one file
    for (const chunkFile of chunkFiles) {
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(path.join(outputDir, chunkFile));
        readStream.pipe(writeStream, { end: false });
        readStream.on('error', reject);
        readStream.on('end', resolve); // Resolve once the readStream finishes
      });
    }

    // Ensure the write stream has fully finished
    await new Promise((resolve, reject) => {
      writeStream.end();  // End the write stream
      finished(writeStream, (err) => {  // Wait until the write stream is fully finished
        if (err) reject(err);
        else resolve();
      });
    });

    // Now calculate the MD5 hash of both the original and concatenated files
    const [originalHash, concatenatedHash] = await Promise.all([
      calculateMD5(filePath),
      calculateMD5(concatenatedFile)
    ]);

    // Compare the hashes to verify integrity
    if (originalHash === concatenatedHash) {
      console.log('File integrity verified, no data loss.');
      processedFiles.add(fileName);  // Mark the file as processed
    } else {
      throw new Error('Data mismatch detected after splitting.');
    }
  } catch (error) {
    console.error(`Error verifying file integrity: ${error.message}`);
    throw error;
  }
}


// Function to process the file: split, verify integrity, and notify via email
async function processFile(filePath) {
  console.log(`Started processing file: ${filePath}`);
  await splitFile(filePath);
  console.log(`File split complete: ${filePath}`);

  await verifyFileIntegrity(filePath);
  
  console.log(`File verification complete: ${filePath}`);
}
