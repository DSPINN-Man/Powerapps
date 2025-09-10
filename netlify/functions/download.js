const { promises: fs } = require('fs');
const path = require('path');
const archiver = require('archiver');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { sessionId } = event.queryStringParameters || {};
    
    if (!sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Session ID is required' })
      };
    }

    const resultsDir = path.join('/tmp', 'results', sessionId);
    
    // Check if results directory exists
    try {
      await fs.access(resultsDir);
    } catch (error) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Results not found or have expired' })
      };
    }

    // Create zip file in memory
    const zipPath = path.join('/tmp', `${sessionId}_results.zip`);
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', async () => {
        try {
          // Read zip file as base64 for response
          const zipBuffer = await fs.readFile(zipPath);
          
          // Clean up zip file
          await fs.unlink(zipPath);
          
          resolve({
            statusCode: 200,
            headers: {
              ...headers,
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${sessionId}_results.zip"`
            },
            body: zipBuffer.toString('base64'),
            isBase64Encoded: true
          });
        } catch (error) {
          console.error('Zip read error:', error);
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to prepare download' })
          });
        }
      });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        resolve({
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to create archive' })
        });
      });

      archive.pipe(output);

      // Add all files from results directory
      archive.directory(resultsDir, false);

      archive.finalize();
    });

  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Download failed' })
    };
  }
};