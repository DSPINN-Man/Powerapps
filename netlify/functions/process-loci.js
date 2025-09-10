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
    const { filename, sheetName = 'Impedance Loci Vertices' } = body;

    if (!filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Filename is required' })
      };
    }

    const sessionId = `loci_${uuidv4()}`;
    const tempDir = path.join('/tmp', sessionId);
    const resultsDir = path.join('/tmp', 'results');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(resultsDir, { recursive: true });

    const inputPath = path.join('/tmp', 'uploads', filename);
    const workingLociFile = path.join(tempDir, 'Loci_Script_Inputs.xlsm');
    await fs.copyFile(inputPath, workingLociFile);

    async function getOriginalClockwiseScript() {
      const candidates = [
        path.join(__dirname, '..', '..', 'python scripts', 'Make Loci_Inputs_Clockwise.py'),
        path.join(process.cwd(), 'python scripts', 'Make Loci_Inputs_Clockwise.py'),
        path.join(__dirname, 'python scripts', 'Make Loci_Inputs_Clockwise.py'),
      ];
      for (const p of candidates) {
        try {
          const content = await fs.readFile(p, 'utf-8');
          return content;
        } catch (_) {}
      }
      return null;
    }

    let scriptContent = await getOriginalClockwiseScript();
    if (!scriptContent) {
      scriptContent = `
import math
import pandas as pd
import numpy as np

def sort_points_clockwise(points):
    if not points:
        return []
    cx = sum(p[0] for p in points) / len(points)
    cy = sum(p[1] for p in points) / len(points)
    points_sorted = sorted(points, key=lambda p: math.atan2(p[1] - cy, p[0] - cx), reverse=True)
    points_sorted.append(points_sorted[0])
    return points_sorted

def main():
    input_file = 'Loci_Script_Inputs.xlsm'
    output_file = 'Loci_Script_Inputs_Clockwise.xlsx'
    sheet_name = '${sheetName}'
    header_option = 0
    df = pd.read_excel(input_file, sheet_name=sheetName, header=header_option)
    all_columns = df.columns
    num_cols = len(all_columns)
    num_shapes = num_cols // 2
    for shape_index in range(num_shapes):
        r_col = all_columns[2 * shape_index]
        x_col = all_columns[2 * shape_index + 1]
        shape_points = []
        for row_i in range(len(df)):
            r_val = df.at[row_i, r_col]
            x_val = df.at[row_i, x_col]
            if pd.isna(r_val) and pd.isna(x_val):
                continue
            try:
                r_float = float(r_val)
                x_float = float(x_val)
                shape_points.append((r_float, x_float))
            except:
                pass
        shape_points_clockwise = sort_points_clockwise(shape_points)
        max_rows = len(df)
        for row_i in range(max_rows):
            if row_i < len(shape_points_clockwise):
                df.at[row_i, r_col] = shape_points_clockwise[row_i][0]
                df.at[row_i, x_col] = shape_points_clockwise[row_i][1]
            else:
                df.at[row_i, r_col] = np.nan
                df.at[row_i, x_col] = np.nan
    df.to_excel(output_file, index=False)
    print(f"Clockwise-converted data saved to {output_file}")

if __name__ == '__main__':
    main()
`;
    } else {
      // If using original, adjust sheet name if needed
      scriptContent = scriptContent.replace("sheet_name = 'Impedance Loci Vertices'", `sheet_name = '${sheetName}'`);
    }

    const scriptPath = path.join(tempDir, 'Make Loci_Inputs_Clockwise.py');
    await fs.writeFile(scriptPath, scriptContent);
    await executeScript('python3', [scriptPath], tempDir);

    const finalResultsDir = path.join(resultsDir, sessionId);
    await fs.mkdir(finalResultsDir, { recursive: true });
    const files = await fs.readdir(tempDir);
    const resultFiles = [];
    for (const file of files) {
      if (file.endsWith('.xlsx') || file.endsWith('.txt')) {
        const sourcePath = path.join(tempDir, file);
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
        message: 'Loci processing completed successfully',
        sessionId,
        resultFiles,
        downloadUrl: `/api/download?sessionId=${sessionId}`
      })
    };
  } catch (error) {
    console.error('Loci processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Loci processing failed', details: error.message })
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


