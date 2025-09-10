const multiparty = require('multiparty');
const { promises: fs } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  // Enable CORS
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
    // Create upload directory in /tmp
    const uploadDir = path.join('/tmp', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Parse multipart form data
    const form = new multiparty.Form();
    
    return new Promise((resolve, reject) => {
      form.parse(event.body, async (err, fields, files) => {
        if (err) {
          resolve({
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Failed to parse form data' })
          });
          return;
        }

        const file = files.file?.[0];
        if (!file) {
          resolve({
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No file uploaded' })
          });
          return;
        }

        // Validate file type
        const allowedTypes = ['.xlsx', '.xlsm', '.xls', '.csv'];
        const fileExt = path.extname(file.originalFilename || '').toLowerCase();
        
        if (!allowedTypes.includes(fileExt)) {
          resolve({
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid file type. Only Excel and CSV files are allowed.' })
          });
          return;
        }

        try {
          // Generate unique filename
          const uniqueFilename = `${uuidv4()}_${file.originalFilename?.replace(/\s+/g, '_')}`;
          const newPath = path.join(uploadDir, uniqueFilename);
          
          // Copy file to new location
          await fs.copyFile(file.path, newPath);

          resolve({
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: 'File uploaded successfully',
              filename: uniqueFilename,
              originalName: file.originalFilename,
              path: newPath,
              size: file.size
            })
          });
        } catch (error) {
          console.error('File processing error:', error);
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'File processing failed' })
          });
        }
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'File upload failed' })
    };
  }
};