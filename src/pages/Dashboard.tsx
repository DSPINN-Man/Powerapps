import { BarChart3, Shuffle, RotateCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ToolCard = ({ tool }: { tool: typeof tools[0] }) => {
  return (
    <Card className="minimal-card hover-lift transition-all duration-200 border">
      <CardHeader className="pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-md bg-muted">
            <tool.icon className="h-5 w-5 text-foreground" />
          </div>
          <CardTitle className="text-lg font-medium">{tool.title}</CardTitle>
        </div>
        <CardDescription className="text-muted-foreground leading-relaxed">
          {tool.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">Features</h4>
          <ul className="space-y-2">
            {tool.features.map((feature, index) => (
              <li key={index} className="text-sm text-foreground flex items-center gap-2">
                <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h5 className="font-medium mb-2 text-xs uppercase tracking-wide text-muted-foreground">Inputs</h5>
            <ul className="space-y-1">
              {tool.inputs.map((input, index) => (
                <li key={index} className="text-muted-foreground text-sm">{input}</li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2 text-xs uppercase tracking-wide text-muted-foreground">Outputs</h5>
            <ul className="space-y-1">
              {tool.outputs.map((output, index) => (
                <li key={index} className="text-muted-foreground text-sm">{output}</li>
              ))}
            </ul>
          </div>
        </div>
        <Button asChild className="w-full mt-6" variant="outline">
          <Link to={tool.path}>
            Open Tool
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const tools = [
  {
    id: "heatmap",
    title: "Heatmap Generator",
    description: "Transform harmonic calculation data into beautiful heatmap visualizations with PowerFactory-compatible matrices.",
    icon: BarChart3,
    color: "electric",
    features: ["Excel input support", "Multiple colormap options", "PNG/SVG export", "PowerFactory CSV output"],
    inputs: ["Excel files (.xlsx/.xlsm/.xls)", "Column selection", "Resolution settings"],
    outputs: ["Heatmap plots", "CSV matrices", "Interactive HTML"],
    path: "/heatmap"
  },
  {
    id: "matrix",
    title: "PowerFactory Matrix Converter", 
    description: "Convert impedance loci data into PowerFactory-compatible matrix formats with visual previews.",
    icon: Shuffle,
    color: "success",
    features: ["Impedance data processing", "Matrix format conversion", "Visual preview", "PowerFactory compatibility"],
    inputs: ["Excel files (.xlsx/.xlsm/.xls)", "Custom delimiters", "Sheet mapping"],
    outputs: ["PowerFactory matrices", "CSV/TXT files", "Preview HTML"],
    path: "/matrix"
  },
  {
    id: "loci",
    title: "Loci Clockwise Tool",
    description: "Reorder impedance loci data in clockwise fashion and visualize the optimized sequence.",
    icon: RotateCw,  
    color: "warning",
    features: ["Clockwise reordering", "Data visualization", "Sequence optimization", "Multiple formats"],
    inputs: ["Excel files (.xlsx/.xlsm/.xls)", "X/Y column selection", "Ordering options"],
    outputs: ["Reordered loci files", "Excel/CSV export", "Sequence diagrams"],
    path: "/loci"
  }
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="px-8 pt-16 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-semibold mb-4 text-foreground">
            Power Systems Tools
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Professional power system analysis tools for engineers. Upload your data, configure parameters, and generate results with ease.
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}