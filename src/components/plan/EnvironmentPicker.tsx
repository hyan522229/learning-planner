import { useEnvironmentStore } from '@/stores/environmentStore';
import { cn } from '@/utils/cn';
import { Globe } from 'lucide-react';

interface Props {
  onSelect?: (envId: string) => void;
}

export function EnvironmentPicker({ onSelect }: Props) {
  const environments = useEnvironmentStore(s => s.environments);
  const activeId = useEnvironmentStore(s => s.activeEnvironmentId);
  const setActive = useEnvironmentStore(s => s.setActiveEnvironment);

  const handleSelect = (id: string) => {
    setActive(id);
    onSelect?.(id);
  };

  return (
    <div className="flex items-center gap-1.5 bg-muted rounded-lg p-0.5">
      <Globe size={14} className="ml-2 text-muted-foreground" />
      {environments.map(env => (
        <button
          key={env.id}
          onClick={() => handleSelect(env.id)}
          className={cn(
            'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            env.id === activeId
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {env.name}
        </button>
      ))}
    </div>
  );
}
