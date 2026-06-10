import { useState } from 'react';
import { LeftToolbar } from './components/LeftToolbar';
import { RightPropertiesPanel } from './components/RightPropertiesPanel';
import { StudioCanvas } from './components/StudioCanvas';
import { TopBar } from './components/TopBar';
import { ToastHost } from './components/ToastHost';

type MobilePanel = 'add' | 'properties' | null;

export default function App() {
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null);
  const toggleMobilePanel = (panel: Exclude<MobilePanel, null>) => {
    setActiveMobilePanel((activePanel) => (activePanel === panel ? null : panel));
  };

  return (
    <main className={`app-shell ${activeMobilePanel ? 'mobile-panel-active' : ''}`.trim()}>
      <TopBar />
      <LeftToolbar className={activeMobilePanel === 'add' ? 'mobile-panel-open' : ''} />
      <StudioCanvas />
      <RightPropertiesPanel className={activeMobilePanel === 'properties' ? 'mobile-panel-open' : ''} />
      {activeMobilePanel && <button type="button" className="mobile-panel-scrim" aria-label="Close panel" onClick={() => setActiveMobilePanel(null)} />}
      <nav className="mobile-shell-dock" aria-label="Mobile workspace panels">
        <button
          type="button"
          className={activeMobilePanel === 'add' ? 'active' : ''}
          aria-pressed={activeMobilePanel === 'add'}
          onClick={() => toggleMobilePanel('add')}
        >
          Add
        </button>
        <button
          type="button"
          className={activeMobilePanel === 'properties' ? 'active' : ''}
          aria-pressed={activeMobilePanel === 'properties'}
          onClick={() => toggleMobilePanel('properties')}
        >
          Properties
        </button>
      </nav>
      <ToastHost />
    </main>
  );
}
