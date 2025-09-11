const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { lociBlob, sheetName = 'Impedance Loci Vertices', lociUnit = 'Ω' } = body;

    if (!lociBlob) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'lociBlob is required' })
      };
    }

    const sessionId = `matrix_${uuidv4()}`;
    const tempDir = path.join('/tmp', sessionId);
    const resultsDir = path.join('/tmp', 'results');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(resultsDir, { recursive: true });

    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const lociClient = containerClient.getBlobClient(lociBlob);
    const download = await lociClient.download();
    const workingLociFile = path.join(tempDir, 'Loci_Script_Inputs.xlsm');
    await new Promise((resolve, reject) => {
      const ws = require('fs').createWriteStream(workingLociFile);
      download.readableStreamBody.pipe(ws);
      ws.on('finish', resolve);
      ws.on('error', reject);
    });

    async function getOriginalPFScript() {
      const candidates = [
        path.join(__dirname, '..', '..', 'python scripts', 'PF_format_w_vertices.py'),
        path.join(process.cwd(), 'python scripts', 'PF_format_w_vertices.py'),
        path.join(__dirname, 'python scripts', 'PF_format_w_vertices.py'),
      ];
      for (const p of candidates) {
        try {
          const content = await fs.readFile(p, 'utf-8');
          return content;
        } catch (_) {}
      }
      return null;
    }

    let pfScriptContent = await getOriginalPFScript();
    if (!pfScriptContent) {
      throw new Error('Original PF_format_w_vertices.py not found');
    }
    // Adjust input/output parameters dynamically
    pfScriptContent = pfScriptContent
      .replace("loci_file = 'Loci_Script_Inputs.xlsm'", "loci_file = 'Loci_Script_Inputs.xlsm'")
      .replace("sheet_name = 'Impedance Loci Vertices'", `sheet_name = '${sheetName}'`)
      .replace("output_folder = 'Mins & Maxes (w Vertices) (ohms)'", "output_folder = 'Mins & Maxes (w Vertices) (ohms)'")
      .replace("Loci_unit = 'ohm'", "Loci_unit = 'ohm'");

    const pfScriptPath = path.join(tempDir, 'PF_format_w_vertices.py');
    await fs.writeFile(pfScriptPath, pfScriptContent);
    await executeScript('python3', [pfScriptPath], tempDir);

    const finalResultsDir = path.join(resultsDir, sessionId);
    await fs.mkdir(finalResultsDir, { recursive: true });
    const files = await fs.readdir(tempDir);
    const resultFiles = [];
    for (const file of files) {
      const sourcePath = path.join(tempDir, file);
      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory() && file.includes('Mins & Maxes')) {
        const dirFiles = await fs.readdir(sourcePath);
        const destDir = path.join(finalResultsDir, file);
        await fs.mkdir(destDir, { recursive: true });
        for (const dirFile of dirFiles) {
          const srcFile = path.join(sourcePath, dirFile);
          const destFile = path.join(destDir, dirFile);
          await fs.copyFile(srcFile, destFile);
          resultFiles.push(`${file}/${dirFile}`);
        }
      } else if (file.endsWith('.xlsx')) {
        const destPath = path.join(finalResultsDir, file);
        await fs.copyFile(sourcePath, destPath);
        resultFiles.push(file);
      }
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Matrix conversion completed successfully',
        sessionId,
        resultFiles,
        downloadUrl: `/api/download?sessionId=${sessionId}`
      })
    };
  } catch (error) {
    console.error('Matrix processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Matrix processing failed', details: error.message })
    };
  }
};

function executeScript(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); console.log('Python output:', data.toString()); });
    child.stderr.on('data', (data) => { stderr += data.toString(); console.error('Python error:', data.toString()); });
    child.on('close', (code) => { code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`Script failed with code ${code}: ${stderr}`)); });
    child.on('error', (error) => reject(error));
  });
}


