const { promises: fs } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const parseMultipart = require('parse-multipart');

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

    // Parse multipart body in AWS/Netlify Lambda environment
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid content type. Expected multipart/form-data.' })
      };
    }

    // Decode base64 body into buffer
    const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body || '', 'utf8');
    // Extract boundary
    const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
    if (!boundaryMatch) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing multipart boundary' }) };
    }
    const boundary = boundaryMatch[1];
    const parts = parseMultipart.Parse(bodyBuffer, boundary);
    const filePart = parts.find(p => p.filename && p.data);
    if (!filePart) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No file uploaded' }) };
    }

    const originalFilename = filePart.filename || 'upload.xlsx';
    const fileExt = path.extname(originalFilename).toLowerCase();
    const allowedTypes = ['.xlsx', '.xlsm', '.xls', '.csv'];
    if (!allowedTypes.includes(fileExt)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid file type. Only Excel and CSV files are allowed.' })
      };
    }

    const uniqueFilename = `${uuidv4()}_${originalFilename.replace(/\s+/g, '_')}`;
    const newPath = path.join(uploadDir, uniqueFilename);
    await fs.writeFile(newPath, filePart.data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'File uploaded successfully',
        filename: uniqueFilename,
        originalName: originalFilename,
        path: newPath,
        size: filePart.data.length
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'File upload failed' })
    };
  }
};