import { useStudioStore } from '../state/studioStore';
import type { AxisMoveLock } from '../types/studioTypes';

const axisLockOptions: Array<{ value: AxisMoveLock; label: string; title: string }> = [
  { value: 'free', label: 'Free', title: 'Free movement' },
  { value: 'x', label: 'X only', title: 'Move on X only' },
  { value: 'y', label: 'Y only', title: 'Move on Y only' },
  { value: 'z', label: 'Z only', title: 'Move on Z only' },
];

export function TransformToolbar({ className = '' }: { className?: string }) {
  const transformMode = useStudioStore((state) => state.transformMode);
  const axisMoveLock = useStudioStore((state) => state.settings.axisMoveLock);
  const setTransformMode = useStudioStore((state) => state.setTransformMode);
  const updateSettings = useStudioStore((state) => state.updateSettings);

  return (
    <div className={`transform-toolbar ${className}`.trim()} aria-label="Transform controls">
      <div className="transform-mode-controls" aria-label="Transform mode">
        {(['translate', 'rotate', 'scale'] as const).map((mode) => (
          <button key={mode} type="button" className={mode === transformMode ? 'active' : ''} onClick={() => setTransformMode(mode)}>
            {mode}
          </button>
        ))}
      </div>
      <div className="axis-lock-controls" aria-label="Axis movement lock">
        {axisLockOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`axis-lock-button axis-lock-${option.value} ${axisMoveLock === option.value ? 'active' : ''}`}
            onClick={() => updateSettings({ axisMoveLock: option.value })}
            title={option.title}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
