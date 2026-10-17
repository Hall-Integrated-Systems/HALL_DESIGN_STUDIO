import { useEffect, useState } from 'react';
import { LeftToolbar } from './components/LeftToolbar';
import { RightPropertiesPanel } from './components/RightPropertiesPanel';
import { StudioCanvas } from './components/StudioCanvas';
import { isStudioGoal, StudioWelcome } from './components/StudioWelcome';
import type { StudioGoalId } from './components/StudioWelcome';
import { TopBar, type TopMenuId } from './components/TopBar';
import { ToastHost } from './components/ToastHost';
import { useStudioStore } from './state/studioStore';
import type { ProjectTemplateId } from './types/studioTypes';
import { trackClarityEvent } from './utils/clarity';

type MobilePanel = 'add' | 'properties' | null;
type StudioRoute = 'start' | 'workspace' | StudioGoalId;
const sessionGoalKey = 'hall-product-studio.sessionGoal';

function routeFromLocation(): StudioRoute {
  const hash = window.location.hash.slice(1);
  if (hash === 'workspace') return 'workspace';
  if (hash.startsWith('goal-') && isStudioGoal(hash.slice(5))) return hash.slice(5) as StudioGoalId;
  return 'start';
}

function initialGoal(): StudioGoalId | null {
  const route = routeFromLocation();
  if (route !== 'start' && route !== 'workspace') return route;
  try {
    const saved = window.sessionStorage.getItem(sessionGoalKey);
    return saved && isStudioGoal(saved) ? saved : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>(null);
  const [openTopMenu, setOpenTopMenu] = useState<TopMenuId | null>(null);
  const [route, setRoute] = useState<StudioRoute>(routeFromLocation);
  const [activeGoal, setActiveGoal] = useState<StudioGoalId | null>(initialGoal);
  const [showGoalShortcuts, setShowGoalShortcuts] = useState(true);
  const [pendingTemplateId, setPendingTemplateId] = useState<ProjectTemplateId | null>(null);
  const projectTitle = useStudioStore((state) => state.projectTitle);
  const guideOpen = route !== 'workspace';

  const rememberGoal = (goal: StudioGoalId) => {
    setActiveGoal(goal);
    setShowGoalShortcuts(true);
    try { window.sessionStorage.setItem(sessionGoalKey, goal); } catch { /* Session storage is optional. */ }
  };

  useEffect(() => {
    const syncRoute = () => {
      const next = routeFromLocation();
      setRoute(next);
      if (next !== 'start' && next !== 'workspace') rememberGoal(next);
    };
    syncRoute();
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => { window.removeEventListener('popstate', syncRoute); window.removeEventListener('hashchange', syncRoute); };
  }, []);

  const openRoute = (next: StudioRoute) => {
    setPendingTemplateId(null);
    if (next !== 'start' && next !== 'workspace') rememberGoal(next);
    const hash = next === 'start' ? '' : next === 'workspace' ? '#workspace' : `#goal-${next}`;
    if (next !== route) {
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
      setRoute(next);
    }
    setOpenTopMenu(null);
    setActiveMobilePanel(null);
  };

  const enterWorkspace = () => {
    const fromGoal = route !== 'start' && route !== 'workspace';
    openRoute('workspace');
    if (fromGoal && window.matchMedia('(max-width: 1024px)').matches) setActiveMobilePanel('add');
  };

  const applyTemplateAndEnter = (templateId: ProjectTemplateId) => {
    useStudioStore.getState().applyProjectTemplate(templateId);
    trackClarityEvent('template_selected');
    enterWorkspace();
  };

  const startFromTemplate = (templateId: ProjectTemplateId) => {
    const state = useStudioStore.getState();
    if (state.objects.length > 0 || state.isDirty || state.activeBrowserProjectId || state.projectSource !== 'new') {
      setPendingTemplateId(templateId);
      return;
    }
    applyTemplateAndEnter(templateId);
  };

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
      <div className="studio-workspace" inert={guideOpen}>
      <TopBar openMenu={openTopMenu} setOpenMenu={handleTopMenuChange} guideOpen={guideOpen} onOpenGoals={() => openRoute('start')} />
      <LeftToolbar className={activeMobilePanel === 'add' ? 'mobile-panel-open' : ''} goal={activeGoal === 'part' ? null : activeGoal} showGoalShortcuts={showGoalShortcuts} onDismissGoalShortcuts={() => setShowGoalShortcuts(false)} onChangeGoal={() => openRoute('start')} />
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
      </div>
      {guideOpen && <StudioWelcome goal={route === 'start' ? null : route} projectTitle={projectTitle} pendingTemplateId={pendingTemplateId} onChooseGoal={(goal) => openRoute(goal)} onBack={() => openRoute('start')} onOpenWorkspace={enterWorkspace} onStartTemplate={startFromTemplate} onCancelTemplate={() => setPendingTemplateId(null)} onConfirmTemplate={() => { if (pendingTemplateId) applyTemplateAndEnter(pendingTemplateId); }} />}
    </main>
  );
}
