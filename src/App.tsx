import { useState } from 'react';
import { LeftToolbar } from './components/LeftToolbar';
import { RightPropertiesPanel } from './components/RightPropertiesPanel';
import { StudioCanvas } from './components/StudioCanvas';
import { TopBar, type TopMenuId } from './components/TopBar';
import { ToastHost } from './components/ToastHost';

type MobilePanel = 'add' | 'properties' | null;

export default function App() {
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null);
  const [openTopMenu, setOpenTopMenu] = useState<TopMenuId | null>(null);

  const toggleMobilePanel = (panel: Exclude<MobilePanel, null>) => {
    setOpenTopMenu(null);
    setActiveMobilePanel((activePanel) => (activePanel === panel ? null : panel));
  };
  const handleTopMenuChange = (menu: TopMenuId | null) => {
    if (menu) setActiveMobilePanel(null);
    setOpenTopMenu(menu);
  };
  const closeOverlays = () => {
    setOpenTopMenu(null);
    setActiveMobilePanel(null);
  };

  return (
    <main className={`app-shell ${activeMobilePanel ? 'mobile-panel-active' : ''} ${openTopMenu ? 'top-menu-active' : ''}`.trim()}>
      <TopBar openMenu={openTopMenu} setOpenMenu={handleTopMenuChange} />
      <LeftToolbar className={activeMobilePanel === 'add' ? 'mobile-panel-open' : ''} />
      <StudioCanvas onCanvasPointerDown={() => setOpenTopMenu(null)} />
      <RightPropertiesPanel className={activeMobilePanel === 'properties' ? 'mobile-panel-open' : ''} />
      {activeMobilePanel && <button type="button" className="mobile-panel-scrim" aria-label="Close panel" onClick={closeOverlays} />}
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
