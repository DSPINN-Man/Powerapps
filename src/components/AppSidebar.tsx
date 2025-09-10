import { BarChart3, Shuffle, RotateCw, Home, Zap } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const tools = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: Home,
    description: "Overview of all tools"
  },
  { 
    title: "Heatmap Generator", 
    url: "/heatmap", 
    icon: BarChart3,
    description: "Generate heatmap plots from harmonic data"
  },
  { 
    title: "Matrix Converter", 
    url: "/matrix", 
    icon: Shuffle,
    description: "Convert impedance data to PowerFactory format"
  },
  { 
    title: "Loci Clockwise", 
    url: "/loci", 
    icon: RotateCw,
    description: "Reorder impedance loci data clockwise"
  },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isActive = (path: string) => currentPath === path;
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center w-full transition-all duration-200 ${
      isActive 
        ? "bg-electric/10 text-electric border-r-2 border-electric shadow-glow" 
        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    }`;

  return (
    <Sidebar className="border-r border-border/50 bg-gradient-to-b from-background to-background/95">
      <SidebarHeader className="border-b border-border/50 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Power Systems</h2>
            <p className="text-sm text-muted-foreground">Analysis Tools</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {tools.map((tool) => (
                <SidebarMenuItem key={tool.title}>
                  <SidebarMenuButton asChild className="h-auto p-0">
                    <NavLink 
                      to={tool.url} 
                      end 
                      className={getNavClasses}
                    >
                      {({ isActive }) => (
                        <div className="flex items-start gap-3 p-3 w-full">
                          <tool.icon className={`h-5 w-5 mt-0.5 ${isActive ? 'text-electric' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${isActive ? 'text-electric' : 'text-foreground'}`}>
                              {tool.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {tool.description}
                            </div>
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}