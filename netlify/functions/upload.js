const multiparty = require('multiparty');
const multipart = require('aws-lambda-multipart-parser');
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

    // Parse multipart body in AWS/Netlify Lambda environment
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid content type. Expected multipart/form-data.' })
      };
    }

    const parsed = multipart.parse(event, true); // parse buffers
    const fileField = parsed.file || parsed.files || parsed.upload || null;

    let fileObj = null;
    if (Array.isArray(fileField)) {
      fileObj = fileField[0];
    } else if (fileField && fileField.content) {
      fileObj = fileField;
    }

    if (!fileObj) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No file uploaded' })
      };
    }

    const originalFilename = fileObj.filename || 'upload.xlsx';
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
    await fs.writeFile(newPath, fileObj.content);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'File uploaded successfully',
        filename: uniqueFilename,
        originalName: originalFilename,
        path: newPath,
        size: fileObj.content.length
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