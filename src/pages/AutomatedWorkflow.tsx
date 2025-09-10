import { useState, useCallback } from "react";
import { 
  Zap, Settings, Play, Download, Eye, FileText, 
  CheckCircle, Clock, AlertCircle, Upload, BarChart3,
  Shuffle, RotateCw, ArrowRight, Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  icon: React.ElementType;
  results?: string[];
  errorMessage?: string;
}

interface ProcessingResults {
  sessionId?: string;
  clockwise?: {
    available: boolean;
    file?: string;
    size?: number;
  };
  powerfunction?: {
    available: boolean;
    folder?: string;
    files?: string[];
  };
  plots?: {
    available: boolean;
    folder?: string;
    files?: string[];
  };
}

const API_BASE_URL = '/api';

export default function AutomatedWorkflow() {
  const [lociFile, setLociFile] = useState<File[]>([]);
  const [harmonicsFile, setHarmonicsFile] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessingResults>({});
  
  // Configuration options
  const [sheetName, setSheetName] = useState('Impedance Loci Vertices');
  const [limitsSheetName, setLimitsSheetName] = useState('Harmonic Limits');
  const [lociUnit, setLociUnit] = useState('Ω');
  const [reorderVertices, setReorderVertices] = useState(true);
  const [generatePlots, setGeneratePlots] = useState(true);
  
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: 'upload',
      title: 'File Upload & Validation',
      description: 'Upload impedance loci data and harmonic calculation results',
      status: 'pending',
      icon: Upload
    },
    {
      id: 'clockwise',
      title: 'Loci Clockwise Ordering',
      description: 'Reorder impedance loci vertices in clockwise sequence',
      status: 'pending',
      icon: RotateCw
    },
    {
      id: 'powerfunction',
      title: 'PowerFactory Format Generation',
      description: 'Convert data to PowerFactory-compatible matrices and DS format',
      status: 'pending',
      icon: Shuffle
    },
    {
      id: 'plots',
      title: 'Harmonic Analysis Plots',
      description: 'Generate comprehensive visualization plots and compliance reports',
      status: 'pending',
      icon: BarChart3
    }
  ]);

  const updateStepStatus = (stepId: string, status: WorkflowStep['status'], results?: string[], errorMessage?: string) => {
    setWorkflowSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, results, errorMessage }
        : step
    ));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('File upload failed');
    }
    
    const data = await response.json();
    return data.filename;
  };

  const fetchResults = async (sessionId: string): Promise<ProcessingResults> => {
    const response = await fetch(`${API_BASE_URL}/results/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch results');
    }
    
    const data = await response.json();
    return data.results;
  };

  const handleFullWorkflow = async () => {
    if (lociFile.length === 0 || harmonicsFile.length === 0) {
      alert('Please upload both impedance loci data and harmonic calculation files');
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    setCurrentStep(0);
    
    try {
      // Step 1: Upload and validate files
      updateStepStatus('upload', 'running');
      setProgress(10);
      
      const lociFilename = await uploadFile(lociFile[0]);
      const harmonicsFilename = await uploadFile(harmonicsFile[0]);
      
      updateStepStatus('upload', 'completed', [
        `Loci file: ${lociFile[0].name}`,
        `Harmonics file: ${harmonicsFile[0].name}`
      ]);
      setProgress(25);
      setCurrentStep(1);
      
      // Step 2-4: Process complete workflow
      updateStepStatus('clockwise', 'running');
      updateStepStatus('powerfunction', 'running');  
      updateStepStatus('plots', 'running');
      
      const response = await fetch(`${API_BASE_URL}/process-workflow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: lociFilename,
          harmonicsFile: harmonicsFilename,
          sheetName,
          limitsSheetName,
          lociUnit,
          reorderVertices,
          generatePlots
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Workflow processing failed');
      }
      
      const workflowResult = await response.json();
      setSessionId(workflowResult.sessionId);
      
      // Update all steps as completed
      updateStepStatus('clockwise', 'completed', [
        reorderVertices ? 'Vertices reordered in clockwise sequence' : 'Skipped - using original order'
      ]);
      setProgress(50);
      
      updateStepStatus('powerfunction', 'completed', [
        'DS Format matrices generated',
        'PowerFactory-compatible files created',
        'Min/Max impedance values calculated'
      ]);
      setProgress(75);
      
      updateStepStatus('plots', 'completed', [
        generatePlots ? 'Analysis plots generated' : 'Skipped - plot generation disabled'
      ]);
      setProgress(100);
      
      // Set results for download
      setResults({
        sessionId: workflowResult.sessionId,
        clockwise: { available: reorderVertices },
        powerfunction: { available: true, files: workflowResult.resultFiles },
        plots: { available: generatePlots }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const stepId = workflowSteps[currentStep]?.id;
      if (stepId) {
        updateStepStatus(stepId, 'error', undefined, errorMessage);
      }
      console.error('Workflow error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResults = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/download?sessionId=${sessionId}`);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionId}_results.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    }
  };

  const StepIcon = ({ step }: { step: WorkflowStep }) => {
    const IconComponent = step.icon;
    
    if (step.status === 'running') {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else if (step.status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (step.status === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <IconComponent className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Automated Power Systems Workflow</h1>
            <p className="text-muted-foreground">
              Complete end-to-end processing of impedance loci data and harmonic analysis
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Badge variant="secondary">Fully Automated</Badge>
          <Badge variant="secondary">Python Integration</Badge>
          <Badge variant="secondary">PowerFactory Compatible</Badge>
          <Badge variant="secondary">Real-time Progress</Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="configuration" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="workflow">Workflow Progress</TabsTrigger>
            <TabsTrigger value="results">Results & Downloads</TabsTrigger>
          </TabsList>
          
          <TabsContent value="configuration" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Upload Configuration */}
              <Card className="border border-border/50 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Input Files
                  </CardTitle>
                  <CardDescription>
                    Upload your impedance loci data and harmonic calculation results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium mb-3 block">
                      Impedance Loci Data (.xlsx/.xlsm/.xls)
                    </Label>
                    <FileUpload
                      acceptedTypes={['.xlsx', '.xlsm', '.xls']}
                      maxSize={20}
                      onFilesSelected={setLociFile}
                      multiple={false}
                      files={lociFile}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium mb-3 block">
                      Harmonic Calculation Results (.xlsx/.xlsm/.xls)
                    </Label>
                    <FileUpload
                      acceptedTypes={['.xlsx', '.xlsm', '.xls']}
                      maxSize={20}
                      onFilesSelected={setHarmonicsFile}
                      multiple={false}
                      files={harmonicsFile}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Processing options removed per requirement; defaults used internally */}
            </div>

            {/* Start Workflow Button */}
            <Card className="border border-border/50 bg-gradient-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Ready to Process</h3>
                    <p className="text-sm text-muted-foreground">
                      Start the automated workflow to process your data through all stages
                    </p>
                  </div>
                  <Button 
                    onClick={handleFullWorkflow}
                    disabled={lociFile.length === 0 || harmonicsFile.length === 0 || processing}
                    size="lg"
                    className="gap-2"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start Workflow
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            {/* Progress Overview */}
            {processing && (
              <Card className="border border-border/50 bg-gradient-card">
                <CardHeader>
                  <CardTitle>Processing Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground">
                      Step {currentStep + 1} of {workflowSteps.length}: {workflowSteps[currentStep]?.title}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Workflow Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowSteps.map((step, index) => (
                <Card key={step.id} className={`border border-border/50 bg-gradient-card transition-all duration-200 ${
                  step.status === 'running' ? 'ring-2 ring-blue-500/20' : ''
                } ${
                  step.status === 'error' ? 'ring-2 ring-red-500/20' : ''
                } ${
                  step.status === 'completed' ? 'ring-2 ring-green-500/20' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <StepIcon step={step} />
                      {step.title}
                    </CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {step.status === 'error' && step.errorMessage && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{step.errorMessage}</AlertDescription>
                      </Alert>
                    )}
                    
                    {step.results && step.results.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Results:</Label>
                        <ul className="space-y-1">
                          {step.results.map((result, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 bg-green-500 rounded-full" />
                              {result}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {sessionId ? (
              <Card className="border border-border/50 bg-gradient-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Processing Results
                  </CardTitle>
                  <CardDescription>
                    Your workflow has been completed successfully. Download the complete results package.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/20">
                      <RotateCw className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium">Clockwise Loci</h4>
                        <p className="text-sm text-muted-foreground">Reordered vertex data</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/20">
                      <Shuffle className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium">PowerFactory Data</h4>
                        <p className="text-sm text-muted-foreground">DS Format matrices</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/20">
                      <BarChart3 className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium">Analysis Plots</h4>
                        <p className="text-sm text-muted-foreground">Visualization reports</p>
                      </div>
                    </div>
                  </div>
                  
                  {results.powerfunction?.files && (
                    <div className="p-4 rounded-lg border bg-muted/10">
                      <h5 className="font-medium mb-2">Generated Files:</h5>
                      <p className="text-sm text-muted-foreground">
                        {results.powerfunction.files.length} files ready for download
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <Button 
                      onClick={downloadResults}
                      size="lg"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Complete Results Package
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border/50 bg-gradient-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Complete the automated workflow to generate and download your processed results
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}