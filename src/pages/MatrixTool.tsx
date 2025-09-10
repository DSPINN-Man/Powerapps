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
  const [sheetName, setSheetName] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [startRow, setStartRow] = useState("1");
  const [startCol, setStartCol] = useState("A");
  const [matrixSize, setMatrixSize] = useState("auto");
  const [outputFormat, setOutputFormat] = useState("csv");

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
    setProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2500));
    setProcessing(false);
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
                <Label className="text-base font-medium mb-3 block">Impedance Loci Data (.xlsx/.xlsm/.xls/.csv)</Label>
                <FileUpload
                  acceptedTypes={['.xlsx', '.xlsm', '.xls', '.csv']}
                  maxSize={25}
                  onFilesSelected={setUploadedFiles}
                  multiple={false}
                  files={uploadedFiles}
                />
              </div>

              <Separator />

              {/* File Format Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sheet-name">Sheet Name (Excel only)</Label>
                  <Input
                    id="sheet-name"
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="delimiter">Delimiter (CSV only)</Label>
                  <Select value={delimiter} onValueChange={setDelimiter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {delimiterOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Matrix Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Matrix Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="start-row">Start Row</Label>
                    <Input
                      id="start-row"
                      placeholder="1"
                      value={startRow}
                      onChange={(e) => setStartRow(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="start-col">Start Column</Label>
                    <Input
                      id="start-col"
                      placeholder="A"
                      value={startCol}
                      onChange={(e) => setStartCol(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="matrix-size">Matrix Size</Label>
                    <Select value={matrixSize} onValueChange={setMatrixSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="3x3">3×3</SelectItem>
                        <SelectItem value="4x4">4×4</SelectItem>
                        <SelectItem value="5x5">5×5</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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

              <Separator />

              {/* Custom Mapping */}
              <div>
                <Label htmlFor="custom-mapping">Custom Column Mapping (Optional)</Label>
                <Textarea
                  id="custom-mapping"
                  placeholder="Enter custom column mappings in JSON format, e.g.:
{
  &quot;real_impedance&quot;: &quot;B&quot;,
  &quot;imaginary_impedance&quot;: &quot;C&quot;,
  &quot;frequency&quot;: &quot;D&quot;
}"
                  className="mt-2 min-h-[100px] font-mono text-sm"
                />
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
              <Button variant="outline" className="w-full" disabled>
                <Download className="mr-2 h-4 w-4" />
                PowerFactory Matrix
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