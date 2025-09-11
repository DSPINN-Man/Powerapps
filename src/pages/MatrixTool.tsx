import { useState } from "react";
import { Shuffle, Settings, Play, Download, Eye, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default function MatrixTool() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Simplified UI: only output format matters for download naming; backend is fixed
  const [sheetName, setSheetName] = useState("");
  const [outputFormat, setOutputFormat] = useState("csv");

  const API_BASE_URL = '/api';

  const uploadFile = async (file: File): Promise<string> => {
    const presign = await fetch(`${API_BASE_URL}/presign?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'application/octet-stream')}`);
    if (!presign.ok) throw new Error('Failed to get upload URL');
    const { uploadUrl, blobName } = await presign.json();
    const putResp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });
    if (!putResp.ok) throw new Error('Direct upload failed');
    return blobName as string;
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('File upload failed');
    const data = await response.json();
    return data.filename as string;
  };

  const delimiterOptions = [
    { value: ",", label: "Comma (,)" },
    { value: ";", label: "Semicolon (;)" },
    { value: "\\t", label: "Tab" },
    { value: " ", label: "Space" }
  ];

  const outputFormats = [
    { value: "csv", label: "CSV Format" },
    { value: "txt", label: "TXT Format" },
    { value: "pfx", label: "PowerFactory Format" }
  ];

  const handleProcessing = async () => {
    if (uploadedFiles.length === 0) return;
    setProcessing(true);
    try {
      const lociBlob = await uploadFile(uploadedFiles[0]);
      const response = await fetch(`${API_BASE_URL}/process-matrix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lociBlob, sheetName: sheetName || 'Impedance Loci Vertices' })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.details || 'Matrix conversion failed');
      }
      const result = await response.json();
      setSessionId(result.sessionId);
    } catch (e) {
      console.error(e);
      alert('Conversion failed. Please try again.');
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
          <div className="p-3 rounded-xl bg-success/10 border border-success/20">
            <Shuffle className="h-8 w-8 text-success" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">PowerFactory Matrix Converter</h1>
            <p className="text-muted-foreground">
              Convert impedance loci data into PowerFactory-compatible matrix formats
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary">Impedance Data</Badge>
          <Badge variant="secondary">PowerFactory Compatible</Badge>
          <Badge variant="secondary">Visual Preview</Badge>
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
                Upload impedance data and configure matrix conversion settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div>
                <Label className="text-base font-medium mb-3 block">Impedance Loci Data (.xlsx/.xlsm/.xls)</Label>
                <FileUpload
                  acceptedTypes={['.xlsx', '.xlsm', '.xls']}
                  maxSize={25}
                  onFilesSelected={setUploadedFiles}
                  multiple={false}
                  files={uploadedFiles}
                />
              </div>

              <Separator />

              {/* Output format selection (for naming only) */}
              <div>
                <Label htmlFor="output-format">Output Format</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV Format</SelectItem>
                    <SelectItem value="txt">TXT Format</SelectItem>
                    <SelectItem value="pfx">PowerFactory Format</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Removed matrix configuration per requirement */}

              <Separator />

              {/* Removed custom mapping per requirement */}
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
                Convert Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleProcessing}
                disabled={uploadedFiles.length === 0 || processing}
                className="w-full"
                size="lg"
              >
                {processing ? "Converting..." : "Convert to PowerFactory"}
                <Shuffle className="ml-2 h-4 w-4" />
              </Button>
              
              {processing && (
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-success h-2 rounded-full animate-pulse" style={{width: '45%'}} />
                  </div>
                  <p className="text-sm text-muted-foreground">Converting impedance data to matrix format...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Matrix Preview */}
          <Card className="border border-border/50 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Matrix Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Matrix preview will appear here after conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="border border-border/50 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full" onClick={downloadResults} disabled={!sessionId}>
                <Download className="mr-2 h-4 w-4" />
                Download Results Package
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                Preview HTML
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Eye className="mr-2 h-4 w-4" />
                View Full Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}