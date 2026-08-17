import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

export interface Scenario {
  id: string;
  label: string;
  description: string;
}

interface ScenarioSwitcherProps {
  scenarios: Scenario[];
  activeScenario: string;
  onScenarioChange: (scenarioId: string) => void;
  label?: string;
}

export function ScenarioSwitcher({ scenarios, activeScenario, onScenarioChange, label = 'Preview Scenario' }: ScenarioSwitcherProps) {
  const active = scenarios.find(s => s.id === activeScenario);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5">
      <div className="flex items-center gap-2 shrink-0">
        <Eye className="h-4 w-4 text-amber-600" />
        <Badge variant="outline" className="text-amber-700 border-amber-500/30 bg-amber-500/10 text-xs font-medium">
          DEMO
        </Badge>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">{label}:</span>
        <Select value={activeScenario} onValueChange={onScenarioChange}>
          <SelectTrigger className="h-8 text-xs w-full sm:w-[260px] border-amber-500/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {scenarios.map(s => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{s.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {active && (
          <span className="text-xs text-muted-foreground truncate hidden md:inline">{active.description}</span>
        )}
      </div>
    </div>
  );
}
