import { FileJson2, Github, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface HeaderProps {
  currentArchitectureName?: string;
  breadcrumbs?: string[];
  canNavigateBack?: boolean;
  onNavigateBack?: () => void;
}

export const Header = ({
  currentArchitectureName,
  breadcrumbs = [],
  canNavigateBack = false,
  onNavigateBack
}: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-gradient-primary shadow-glow-primary flex-shrink-0">
              <FileJson2 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  CALM Visualizer
                </h1>
                {canNavigateBack && onNavigateBack && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={onNavigateBack}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back
                  </Button>
                )}
              </div>
              {breadcrumbs.length > 0 ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center gap-1 flex-shrink-0">
                      <span className="truncate max-w-[200px]">{crumb}</span>
                      {index < breadcrumbs.length - 1 && <ChevronRight className="w-3 h-3" />}
                    </div>
                  ))}
                  {currentArchitectureName && (
                    <>
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium text-foreground truncate max-w-[200px]">{currentArchitectureName}</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">FINOS Common Architecture Language Model</p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-shrink-0"
            asChild
          >
            <a href="https://github.com/finos/architecture-as-code" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">FINOS CALM</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
};
