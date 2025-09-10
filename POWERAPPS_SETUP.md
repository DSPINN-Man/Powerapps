# PowerApps Power Systems Toolbox - Web Deployment Guide

## Overview
Your PowerApps toolbox has been upgraded with **full automation** that integrates your existing Python scripts for **web deployment**:
- `Make Loci_Inputs_Clockwise.py` 
- `PF_format_w_vertices.py`
- `Plot_subscript.py`

## What's New - Automated Workflow ⚡

The new **Automated Workflow** provides:
- **Complete end-to-end processing** of your impedance loci data
- **Real-time progress tracking** with visual feedback
- **Python script integration** running on serverless functions
- **Comprehensive results** - DS Format matrices, PowerFactory files, and analysis plots

## System Architecture (Web Deployment)

```
Web Frontend (React) ←→ Serverless API Functions ←→ Python Scripts
        │                        │                       │
        │                        │                       ├─ Clockwise ordering
        │                        │                       ├─ PowerFactory format
        │                        │                       └─ Plot generation
        │                        │
        ├─ File upload           ├─ /api/upload
        ├─ Progress tracking     ├─ /api/process-workflow
        └─ Results download      └─ /api/download
```

## Deployment Options

### Option 1: Netlify (Recommended)
- **Static site hosting** with serverless functions
- **Automatic deployments** from GitHub
- **Built-in Python support**

### Option 2: Vercel
- **Next.js optimized** with API routes
- **Edge functions** for global performance
- **GitHub integration**

### Option 3: AWS/Azure
- **Full control** over infrastructure
- **Scalable** for enterprise use
- **Custom domain** support

## Quick Start - Web Deployment

### Step 1: Choose Your Platform

**For Netlify (Recommended):**
1. Push code to GitHub repository
2. Connect repository to Netlify
3. Deploy automatically

**For Vercel:**  
1. Push code to GitHub repository
2. Import project to Vercel
3. Deploy with one click

**For Custom Hosting:**
1. Build frontend: `npm run build`
2. Deploy `dist/` folder to web server
3. Configure serverless functions

### Step 2: Environment Setup
Ensure your hosting platform supports:
- **Node.js 18+**
- **Python 3.8+**
- **Required Python packages**: pandas, numpy, matplotlib, openpyxl

## Using the Automated Workflow

### 1. Access the Workflow
- Navigate to **"Automated Workflow"** in the sidebar
- Available at your deployed website URL

### 2. Upload Your Files
**Required Files:**
- **Impedance Loci Data** (.xlsx/.xlsm/.xls) - Your loci vertices file
- **Harmonic Calculation Results** (.xlsx/.xlsm/.xls) - Your harmonic analysis data

### 3. Configure Processing
- **Loci Sheet Name**: Usually "Impedance Loci Vertices"
- **Limits Sheet Name**: Usually "Harmonic Limits"  
- **Impedance Unit**: Ω, pu, or ohm
- **Reorder Vertices Clockwise**: Enable/disable clockwise ordering
- **Generate Analysis Plots**: Enable/disable plot generation

### 4. Start Processing
Click **"Start Workflow"** and watch the real-time progress:

1. **File Upload & Validation** ✓
2. **Loci Clockwise Ordering** ⟲ (runs `Make Loci_Inputs_Clockwise.py`)
3. **PowerFactory Format Generation** ⚙️ (runs `PF_format_w_vertices.py`)
4. **Harmonic Analysis Plots** 📊 (runs `Plot_subscript.py`)

### 5. Download Results
After processing completes, download:
- **Clockwise Loci** - Reordered Excel file
- **PowerFactory Data** - DS Format matrices and compatible files
- **Analysis Plots** - Comprehensive harmonic visualizations

## File Structure

```
Scripts Webapp Clean/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx           # Updated with workflow highlight
│   │   ├── AutomatedWorkflow.tsx   # NEW - Complete automation
│   │   ├── HeatmapTool.tsx         # Individual heatmap tool
│   │   ├── MatrixTool.tsx          # Individual matrix tool
│   │   └── LociTool.tsx           # Individual loci tool
│   └── components/
│       ├── AppSidebar.tsx          # Updated navigation
│       └── FileUpload.tsx          # File upload component
├── server/
│   ├── app.js                      # NEW - Backend API
│   ├── package.json                # NEW - Backend dependencies
│   ├── uploads/                    # File upload directory
│   ├── results/                    # Processing results
│   └── temp/                       # Temporary processing files
├── python scripts/
│   ├── Make Loci_Inputs_Clockwise.py  # Your existing script
│   ├── PF_format_w_vertices.py        # Your existing script
│   └── Plot_subscript.py              # Your existing script
└── package.json                   # Frontend dependencies
```

## API Endpoints

The backend provides these endpoints:

- `POST /api/upload` - Upload files
- `POST /api/process/loci-clockwise` - Run clockwise ordering
- `POST /api/process/powerfunction-format` - Run PowerFactory conversion
- `POST /api/process/generate-plots` - Run plot generation
- `GET /api/results/{sessionId}` - Get processing results
- `GET /api/download/{sessionId}/{type}` - Download results

## Troubleshooting

### Backend Issues
- **Port 3001 in use**: Change PORT in `server/app.js`
- **Python not found**: Ensure Python is in your PATH
- **Package missing**: Run `pip install [package-name]`

### Frontend Issues
- **Port 5173 in use**: Vite will automatically suggest another port
- **API connection failed**: Ensure backend is running on port 3001

### Processing Issues
- **File format errors**: Ensure Excel files have correct sheet names
- **Python script errors**: Check that required Python packages are installed
- **Memory issues**: Large files may require more system memory

## Benefits of the New System

### 🚀 **Automation**
- No more manual script execution
- Single-click processing of entire workflow
- Consistent results every time

### 📊 **Progress Tracking**  
- Real-time status updates
- Clear error reporting
- Step-by-step visualization

### 💾 **Results Management**
- Organized file downloads
- Session-based processing
- Comprehensive result packages

### 🔧 **Flexibility**
- Use full automation OR individual tools
- Configurable processing options
- Maintain your existing manual workflow

## Next Steps

1. **Test the system** with your existing data files
2. **Customize configuration** options as needed
3. **Train your team** on the new automated workflow
4. **Keep Python scripts** unchanged - they work exactly as before

The system maintains full compatibility with your existing manual process while adding powerful automation capabilities!

---

**Need Help?** The system is designed to replicate your exact manual workflow. All Python scripts remain unchanged and work identically to your current process.