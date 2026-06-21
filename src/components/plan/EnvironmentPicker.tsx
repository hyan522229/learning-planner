import { useEnvironmentStore } from '@/stores/environmentStore';
import { Globe } from 'lucide-react';
import { PillButton } from '@/components/ui/PillButton';

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
        <PillButton
          key={env.id}
          active={env.id === activeId}
          onClick={() => handleSelect(env.id)}
        >
          {env.name}
        </PillButton>
      ))}
    </div>
  );
}
