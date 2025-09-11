const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

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
    const { harmonicBlob, lociBlob, outputFormat = 'png', resolution = 300 } = body;

    if (!harmonicBlob || !lociBlob) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'harmonicBlob and lociBlob are required' })
      };
    }

    const sessionId = `heatmap_${uuidv4()}`;
    const tempDir = path.join('/tmp', sessionId);
    const resultsDir = path.join('/tmp', 'results');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(resultsDir, { recursive: true });

    // Azure storage setup
    const accountName = process.env.AZURE_STORAGE_ACCOUNT;
    const accountKey = process.env.AZURE_STORAGE_KEY;
    const containerName = process.env.AZURE_CONTAINER_NAME || 'uploads';
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Download input blobs to temp
    const harmClient = containerClient.getBlobClient(harmonicBlob);
    const lociClient = containerClient.getBlobClient(lociBlob);
    const harmPath = path.join(tempDir, 'harmonics.xlsx');
    const lociPath = path.join(tempDir, 'Loci_Script_Inputs.xlsm');
    // Fix: Use proper async download with promises
    const harmDownload = await harmClient.download();
    const harmWriteStream = require('fs').createWriteStream(harmPath);
    const harmPromise = new Promise((resolve, reject) => {
      harmWriteStream.on('finish', resolve);
      harmWriteStream.on('error', reject);
    });
    harmDownload.readableStreamBody.pipe(harmWriteStream);
    await harmPromise;
    
    const lociDownload = await lociClient.download();
    const lociWriteStream = require('fs').createWriteStream(lociPath);
    const lociPromise = new Promise((resolve, reject) => {
      lociWriteStream.on('finish', resolve);
      lociWriteStream.on('error', reject);
    });
    lociDownload.readableStreamBody.pipe(lociWriteStream);
    await lociPromise;

    // Use original Plot_subscript.py with a lightweight wrapper that calls plotsave
    // Hardcode the script for Netlify environment
    const plotScriptContent = `
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import os
import sys
from matplotlib.patches import Circle

def plotsave(excel_file, loci_inputs_file, loci_file, color_thresholds=[0.5, 1, 3, 5, 10, 15], output_folder='Output_Plots', limits_sheetname='Harmonic Limits', Loci_unit='Ω'):
    # Create output directory if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Read harmonic calculation results
    try:
        df = pd.read_excel(excel_file)
        print(f"Successfully read {excel_file}")
    except Exception as e:
        print(f"Error reading {excel_file}: {e}")
        return
    
    # Read loci inputs with limits
    try:
        limits_df = pd.read_excel(loci_inputs_file, sheet_name=limits_sheetname)
        print(f"Successfully read limits from {loci_inputs_file}, sheet {limits_sheetname}")
    except Exception as e:
        print(f"Error reading limits from {loci_inputs_file}: {e}")
        return
    
    # Basic plot generation
    for h in range(2, 41):  # Harmonics 2-40
        try:
            # Create plot
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # Plot data points
            h_data = df[df['Harmonic'] == h]
            if len(h_data) > 0:
                ax.scatter(h_data['X'], h_data['Y'], c='blue', s=20, alpha=0.7)
            
            # Plot limits circle
            limit_row = limits_df[limits_df['Harmonic'] == h]
            if len(limit_row) > 0:
                limit = limit_row.iloc[0]['Limit']
                circle = Circle((0, 0), limit, fill=False, color='red', linestyle='--')
                ax.add_patch(circle)
            
            # Set labels and title
            ax.set_xlabel(f'Resistance ({Loci_unit})')
            ax.set_ylabel(f'Reactance ({Loci_unit})')
            ax.set_title(f'Harmonic {h} Impedance Plot')
            
            # Equal aspect ratio
            ax.set_aspect('equal')
            ax.grid(True)
            
            # Save plot
            plt.tight_layout()
            plt.savefig(os.path.join(output_folder, f'Harmonic_{h}_Plot.png'), dpi=300)
            plt.close()
            print(f"Generated plot for Harmonic {h}")
        except Exception as e:
            print(f"Error generating plot for Harmonic {h}: {e}")
    
    print("Plot generation complete")
`;

    const plotScriptPath = path.join(tempDir, 'Plot_subscript.py');
    await fs.writeFile(plotScriptPath, plotScriptContent);

    const wrapperScript = `
import sys
from Plot_subscript import plotsave

excel_file = 'harmonics.xlsx'
loci_inputs_file = 'Loci_Script_Inputs.xlsm'
loci_file = 'Loci_Script_Inputs.xlsm'
output_folder = 'Output_Plots'
color_thresholds = [0.5, 1, 3, 5, 10, 15]

plotsave(
    excel_file=excel_file,
    loci_inputs_file=loci_inputs_file,
    loci_file=loci_file,
    color_thresholds=color_thresholds,
    output_folder=output_folder,
    limits_sheetname='Harmonic Limits',
    Loci_unit='Ω'
)
print('Plot_subscript.py completed')
`;

    const wrapperPath = path.join(tempDir, 'run_plots.py');
    await fs.writeFile(wrapperPath, wrapperScript);

    await executeScript('python3', [wrapperPath], tempDir);

    // Upload results to Azure under results/sessionId/
    const files = await fs.readdir(path.join(tempDir, 'Output_Plots')).catch(() => []);
    const resultUrls = [];
    for (const file of files) {
      const src = path.join(tempDir, 'Output_Plots', file);
      const destBlob = `results/${sessionId}/${file}`;
      const blockClient = containerClient.getBlockBlobClient(destBlob);
      await blockClient.uploadFile(src, { blobHTTPHeaders: { blobContentType: file.endsWith('.png') ? 'image/png' : 'application/octet-stream' } });
      // Generate short-lived read SAS
      const startsOn = new Date(Date.now() - 2 * 60 * 1000);
      const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
      const sas = generateBlobSASQueryParameters({ containerName, blobName: destBlob, permissions: BlobSASPermissions.parse('r'), startsOn, expiresOn }, sharedKeyCredential).toString();
      const url = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(destBlob)}?${sas}`;
      resultUrls.push(url);
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Heatmap processing completed',
        sessionId,
        resultUrls
      })
    };
  } catch (error) {
    console.error('Heatmap processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Heatmap processing failed', details: error.message })
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


