const { spawn } = require('child_process');
const { promises: fs } = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
    const { harmonicFile, lociFile, xColumn = 'frequency', yColumn = 'harmonic_order', metricColumn = 'thd', colormap = 'viridis', outputFormat = 'png', resolution = 300 } = body;

    if (!harmonicFile || !lociFile) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'harmonicFile and lociFile are required' })
      };
    }

    const sessionId = `heatmap_${uuidv4()}`;
    const tempDir = path.join('/tmp', sessionId);
    const resultsDir = path.join('/tmp', 'results');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(resultsDir, { recursive: true });

    const inputHarmonics = path.join('/tmp', 'uploads', harmonicFile);
    const inputLoci = path.join('/tmp', 'uploads', lociFile);
    await fs.copyFile(inputHarmonics, path.join(tempDir, 'harmonics.xlsx'));
    await fs.copyFile(inputLoci, path.join(tempDir, 'Loci_Script_Inputs.xlsm'));

    // Use original Plot_subscript.py with a lightweight wrapper that calls plotsave
    async function getOriginalPlotScript() {
      const candidates = [
        path.join(__dirname, '..', '..', 'python scripts', 'Plot_subscript.py'),
        path.join(process.cwd(), 'python scripts', 'Plot_subscript.py'),
        path.join(__dirname, 'python scripts', 'Plot_subscript.py'),
      ];
      for (const p of candidates) {
        try {
          const content = await fs.readFile(p, 'utf-8');
          return content;
        } catch (_) {}
      }
      return null;
    }

    const plotScriptContent = await getOriginalPlotScript();
    if (!plotScriptContent) {
      throw new Error('Original Plot_subscript.py not found');
    }

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

    const finalResultsDir = path.join(resultsDir, sessionId);
    await fs.mkdir(finalResultsDir, { recursive: true });
    const files = await fs.readdir(tempDir);
    const resultFiles = [];
    for (const file of files) {
      const sourcePath = path.join(tempDir, file);
      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory() && file === 'Output_Plots') {
        const dirFiles = await fs.readdir(sourcePath);
        const destDir = path.join(finalResultsDir, file);
        await fs.mkdir(destDir, { recursive: true });
        for (const dirFile of dirFiles) {
          const srcFile = path.join(sourcePath, dirFile);
          const destFile = path.join(destDir, dirFile);
          await fs.copyFile(srcFile, destFile);
          resultFiles.push(`${file}/${dirFile}`);
        }
      } else {
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
        message: 'Heatmap processing completed (placeholder)',
        sessionId,
        resultFiles,
        downloadUrl: `/api/download?sessionId=${sessionId}`
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


