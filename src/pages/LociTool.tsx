import { useState } from "react";
import { RotateCw, Settings, Play, Download, Eye, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default function LociTool() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [orderDirection, setOrderDirection] = useState("clockwise");
  const [outputFormat, setOutputFormat] = useState("xlsx");
  const [includeVisualization, setIncludeVisualization] = useState(true);
  const [preserveOriginal, setPreserveOriginal] = useState(false);

  // Mock columns (in real app, these would come from file analysis)
  const availableColumns = ["real_impedance", "imaginary_impedance", "resistance", "reactance", "magnitude", "phase"];

  const outputFormats = [
    { value: "xlsx", label: "Excel (.xlsx)" },
    { value: "csv", label: "CSV (.csv)" },
    { value: "both", label: "Both formats" }
  ];

  const handleProcessing = async () => {
    setProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2800));
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
            <RotateCw className="h-8 w-8 text-warning" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Loci Clockwise Tool</h1>
            <p className="text-muted-foreground">
              Reorder impedance loci data in clockwise fashion and visualize the sequence
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary">Clockwise Ordering</Badge>
          <Badge variant="secondary">Data Visualization</Badge>
          <Badge variant="secondary">Multiple Export Formats</Badge>
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
                Upload impedance loci data and configure reordering parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div>
                <Label className="text-base font-medium mb-3 block">Impedance Loci Data</Label>
                <FileUpload
                  acceptedTypes={['.xlsx', '.xlsm', '.xls', '.csv']}
                  maxSize={20}
                  onFilesSelected={setUploadedFiles}
                  multiple={false}
                />
              </div>

              <Separator />

              {/* Column Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Columns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="x-column">X-Axis Column (Real/Resistance)</Label>
                    <Select value={xColumn} onValueChange={setXColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select X column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map(col => (
                          <SelectItem key={col} value={col}>{col.replace('_', ' ').toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="y-column">Y-Axis Column (Imaginary/Reactance)</Label>
                    <Select value={yColumn} onValueChange={setYColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Y column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map(col => (
                          <SelectItem key={col} value={col}>{col.replace('_', ' ').toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Ordering Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Ordering Configuration</h3>
                
                <div>
                  <Label className="text-base font-medium mb-3 block">Order Direction</Label>
                  <RadioGroup value={orderDirection} onValueChange={setOrderDirection} className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="clockwise" id="clockwise" />
                      <Label htmlFor="clockwise" className="cursor-pointer">Clockwise</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="counter-clockwise" id="counter-clockwise" />
                      <Label htmlFor="counter-clockwise" className="cursor-pointer">Counter-clockwise</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="preserve-original">Preserve Original Order</Label>
                      <p className="text-xs text-muted-foreground">Keep original data as reference</p>
                    </div>
                    <Switch
                      id="preserve-original"
                      checked={preserveOriginal}
                      onCheckedChange={setPreserveOriginal}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="include-viz">Include Visualization</Label>
                      <p className="text-xs text-muted-foreground">Generate sequence diagram</p>
                    </div>
                    <Switch
                      id="include-viz"
                      checked={includeVisualization}
                      onCheckedChange={setIncludeVisualization}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Output Options */}
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
                Reorder Loci
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleProcessing}
                disabled={uploadedFiles.length === 0 || !xColumn || !yColumn || processing}
                className="w-full"
                size="lg"
              >
                {processing ? "Reordering..." : "Start Reordering"}
                <RotateCw className="ml-2 h-4 w-4" />
              </Button>
              
              {processing && (
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-warning h-2 rounded-full animate-pulse" style={{width: '70%'}} />
                  </div>
                  <p className="text-sm text-muted-foreground">Analyzing loci sequence and reordering...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sequence Preview */}
          <Card className="border border-border/50 bg-gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Sequence Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted/20 rounded-lg border border-border/50 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <RotateCw className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Loci sequence diagram will appear here</p>
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
                Reordered Data
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Eye className="mr-2 h-4 w-4" />
                Sequence Diagram
              </Button>
              {preserveOriginal && (
                <Button variant="outline" className="w-full" disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Original Data
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}