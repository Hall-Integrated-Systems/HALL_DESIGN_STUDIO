import { LeftToolbar } from './components/LeftToolbar';
import { RightPropertiesPanel } from './components/RightPropertiesPanel';
import { StudioCanvas } from './components/StudioCanvas';
import { TopBar } from './components/TopBar';
import { ToastHost } from './components/ToastHost';

export default function App() {
  return (
    <main className="app-shell">
      <TopBar />
      <LeftToolbar />
      <StudioCanvas />
      <RightPropertiesPanel />
      <ToastHost />
    </main>
  );
}
