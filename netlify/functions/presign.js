const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
    if (!accountName || !accountKey || !containerName) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Storage not configured' }) };
    }

    const params = event.queryStringParameters || {};
    const filename = params.filename || '';
    const contentType = params.contentType || 'application/octet-stream';
    if (!filename) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'filename is required' }) };
    }

    const blobName = `${uuidv4()}_${filename.replace(/\s+/g, '_')}`;

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    
    const sasOptions = {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("cw"), // Create and Write permissions
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + 5 * 60 * 1000), // 5 minutes expiry
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    const uploadUrl = `${blobClient.url}?${sasToken}`;
    return { statusCode: 200, headers, body: JSON.stringify({ uploadUrl, blobName }) };
  } catch (err) {
    console.error('presign error', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to generate upload URL' }) };
  }
};


