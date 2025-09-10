import { useState } from "react";
import { BarChart3, Settings, Play, Download, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";
import { Separator } from "@/components/ui/separator";

export default function HeatmapTool() {
  const [harmonicFiles, setHarmonicFiles] = useState<File[]>([]);
  const [lociFiles, setLociFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [metricColumn, setMetricColumn] = useState("");
  const [colormap, setColormap] = useState("viridis");
  const [resolution, setResolution] = useState([300]);
  const [outputFormat, setOutputFormat] = useState("png");

  const API_BASE_URL = '/api';

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('File upload failed');
    const data = await response.json();
    return data.filename as string;
  };

  const colormaps = [
    { value: "viridis", label: "Viridis (Default)" },
    { value: "plasma", label: "Plasma" },
    { value: "inferno", label: "Inferno" },
    { value: "magma", label: "Magma" },
    { value: "coolwarm", label: "Cool Warm" },
    { value: "seismic", label: "Seismic" },
    { value: "jet", label: "Jet" }
  ];

  const outputFormats = [
    { value: "png", label: "PNG Image" },
    { value: "svg", label: "SVG Vector" },
    { value: "html", label: "Interactive HTML" }
  ];

  // Mock columns (in real app, these would come from file analysis)
  const availableColumns = ["frequency", "voltage", "current", "harmonic_order", "thd", "impedance"];

  const handleProcessing = async () => {
    if (harmonicFiles.length === 0 || lociFiles.length === 0) return;
    setProcessing(true);
    try {
      const harmonicFilename = await uploadFile(harmonicFiles[0]);
      const lociFilename = await uploadFile(lociFiles[0]);
      const response = await fetch(`${API_BASE_URL}/process-heatmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          harmonicFile: harmonicFilename,
          lociFile: lociFilename,
          xColumn,
          yColumn,
          metricColumn,
          colormap,
          outputFormat,
          resolution: resolution[0]
        })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.details || 'Heatmap processing failed');
      }
      const result = await response.json();
      setSessionId(result.sessionId);
    } catch (e) {
      console.error(e);
      alert('Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadResults = async () => {
    if (!sessionId) return;
    const response = await fetch(`${API_BASE_URL}/download?sessionId=${sessionId}`);
    if (!response.ok) return alert('Download failed');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionId}_results.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-xl bg-electric/10 border border-electric/20">
            <BarChart3 className="h-8 w-8 text-electric" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Heatmap Generator</h1>
            <p className="text-muted-foreground">
              Transform harmonic calculation data into beautiful heatmap visualizations
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary">Excel Support</Badge>
          <Badge variant="secondary">PowerFactory Export</Badge>
          <Badge variant="secondary">Multiple Formats</Badge>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/50 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Input Configuration
              </CardTitle>
              <CardDescription>
                Upload your harmonic data file and configure the analysis parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div>
                <Label className="text-base font-medium mb-3 block">Harmonic Calculation Results (.xlsx/.xlsm/.xls)</Label>
                <FileUpload
                  acceptedTypes={['.xlsx', '.xlsm', '.xls']}
                  maxSize={50}
                  onFilesSelected={setHarmonicFiles}
                  multiple={false}
                  files={harmonicFiles}
                />
              </div>
              
              <div>
                <Label className="text-base font-medium mb-3 block">Impedance Loci Data with Harmonic Limits (.xlsx/.xlsm/.xls)</Label>
                <FileUpload
                  acceptedTypes={['.xlsx', '.xlsm', '.xls']}
                  maxSize={50}
                  onFilesSelected={setLociFiles}
                  multiple={false}
                  files={lociFiles}
                />
              </div>

              <Separator />

              {/* Column Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="x-column">X-Axis Column</Label>
                  <Select value={xColumn} onValueChange={setXColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="y-column">Y-Axis Column</Label>
                  <Select value={yColumn} onValueChange={setYColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="metric-column">Metric Column</Label>
                  <Select value={metricColumn} onValueChange={setMetricColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Visualization Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="colormap">Color Map</Label>
                  <Select value={colormap} onValueChange={setColormap}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colormaps.map(cm => (
                        <SelectItem key={cm.value} value={cm.value}>{cm.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="output-format">Output Format</Label>
                  <Select value={outputFormat} onValueChange={setOutputFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {outputFormats.map(fmt => (
                        <SelectItem key={fmt.value} value={fmt.value}>{fmt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="resolution">Resolution (DPI): {resolution[0]}</Label>
                <div className="mt-2">
                  <Slider
                    value={resolution}
                    onValueChange={setResolution}
                    max={600}
                    min={150}
                    step={50}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Processing & Results */}
        <div className="space-y-6">
          {/* Processing */}
          <Card className="border border-border/50 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Generate Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleProcessing}
                disabled={harmonicFiles.length === 0 || lociFiles.length === 0 || !xColumn || !yColumn || !metricColumn || processing}
                className="w-full"
                size="lg"
              >
                {processing ? "Processing..." : "Generate"}
                <BarChart3 className="ml-2 h-4 w-4" />
              </Button>
              
              {processing && (
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-electric h-2 rounded-full animate-pulse" style={{width: '60%'}} />
                  </div>
                  <p className="text-sm text-muted-foreground">Analyzing data and generating heatmap...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="border border-border/50 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" disabled>
                <Eye className="mr-2 h-4 w-4" />
                Preview Heatmap
              </Button>
              <Button variant="outline" className="w-full" onClick={downloadResults} disabled={!sessionId}>
                <Download className="mr-2 h-4 w-4" />
                Download Results Package
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}