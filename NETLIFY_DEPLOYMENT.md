# 🚀 Netlify Deployment Guide - PowerApps Toolbox

## Quick Deployment Steps

### 1. **Push to GitHub**
Your code is already in: `https://github.com/DSPINN-Man/Powerapps`

Push the latest changes:
```bash
git add .
git commit -m "Add automated Python workflow for web deployment"
git push origin main
```

### 2. **Deploy on Netlify**

**Option A: Automatic Deployment**
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Choose GitHub and select your `Powerapps` repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
5. Click "Deploy site"

**Option B: Manual Deployment**
1. Build locally: `npm run build`
2. Drag and drop the `dist` folder to Netlify dashboard
3. Upload the `netlify` folder separately for functions

### 3. **Verify Deployment**
- ✅ Frontend loads at your Netlify URL
- ✅ Navigate to "Automated Workflow" page
- ✅ Test file upload functionality
- ✅ Test complete workflow processing

## What's Deployed

### **Frontend (React App)**
- **Dashboard** - Overview of all tools
- **Automated Workflow** - Complete Python script integration
- **Individual Tools** - Heatmap, Matrix, Loci tools
- **Modern UI** - Professional interface with real-time progress

### **Backend (Netlify Functions)**
- **`/api/upload`** - File upload handling
- **`/api/process-workflow`** - Runs your Python scripts
- **`/api/download`** - Results package download

### **Python Script Integration**
Your exact scripts embedded as serverless functions:
- **Clockwise ordering** - `Make Loci_Inputs_Clockwise.py` logic
- **PowerFactory format** - `PF_format_w_vertices.py` logic  
- **Plot generation** - `Plot_subscript.py` capabilities

## Environment Setup

Netlify automatically provides:
- ✅ **Node.js 18** for serverless functions
- ✅ **Python 3.8** for script execution
- ✅ **Required packages** from `requirements.txt`
- ✅ **File storage** in `/tmp` for processing
- ✅ **HTTPS** and custom domain support

## Testing Your Deployment

### 1. **Upload Test Files**
- Prepare your impedance loci Excel file
- Prepare your harmonic calculation Excel file

### 2. **Run Automated Workflow**
- Access the "Automated Workflow" page
- Upload both files
- Configure processing options
- Click "Start Workflow"
- Watch real-time progress
- Download results package

### 3. **Verify Results**
- Check clockwise reordered data
- Verify PowerFactory DS Format matrices
- Confirm analysis plots (if enabled)

## Configuration Options

The workflow supports your exact manual process:
- **Sheet Names** - Configure Excel sheet names
- **Units** - Ω, pu, or ohm
- **Clockwise Reordering** - Enable/disable
- **Plot Generation** - Enable/disable
- **Limits Configuration** - Harmonic limits sheet

## Custom Domain (Optional)

Add your own domain:
1. In Netlify dashboard → Site settings → Domain management
2. Add custom domain (e.g., `tools.enspec.co.uk`)
3. Configure DNS settings
4. SSL certificate auto-generated

## Support & Troubleshooting

### Common Issues:
- **Upload fails**: Check file format (.xlsx, .xlsm, .xls)
- **Processing timeout**: Large files may need optimization
- **Python errors**: Check sheet names and data format

### Monitoring:
- Netlify provides function logs and analytics
- Real-time error reporting
- Performance metrics

## Cost Considerations

**Netlify Free Tier Includes:**
- 100GB bandwidth/month
- 125,000 function invocations/month
- 100 hours function runtime/month

**For Production:**
- Pro plan recommended for higher usage
- Pay-as-you-go for additional resources

## Next Steps

1. **Deploy and test** with your data
2. **Share URL** with your team  
3. **Train users** on the automated workflow
4. **Monitor usage** and optimize as needed

Your PowerApps toolbox is now ready for professional web deployment with the same powerful Python processing you use manually! 🎉