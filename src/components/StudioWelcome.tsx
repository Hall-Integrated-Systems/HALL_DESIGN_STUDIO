import { projectTemplates } from '../config/projectTemplates';
import type { ProjectTemplateId } from '../types/studioTypes';
import './StudioWelcome.css';

export type StudioGoalId = 'product' | 'brand' | 'concept' | 'part' | 'explore';

interface StudioGoal {
  id: StudioGoalId;
  number: string;
  title: string;
  description: string;
  detail: string;
  steps: [string, string, string];
  templates: ProjectTemplateId[];
}

const goals: StudioGoal[] = [
  {
    id: 'product', number: '01', title: 'Show a product',
    description: 'Make clean product images for a website, catalog, or application page.',
    detail: 'Start with a scene built for a clear product image. Add or import the part, arrange the view, then export a presentation-ready image.',
    steps: ['Choose an image format', 'Place your product', 'Frame and export'],
    templates: ['website-product-tile', 'autodesk-application-image', 'photoshop-cutout'],
  },
  {
    id: 'brand', number: '02', title: 'Create a brand visual',
    description: 'Stage a logo, website hero, or presentation graphic.',
    detail: 'Use a wide branded scene as a starting point, then adjust lighting, materials, and camera for the final visual.',
    steps: ['Pick a scene', 'Style the elements', 'Export the image'],
    templates: ['logo-hero-render', 'website-banner'],
  },
  {
    id: 'concept', number: '03', title: 'Plan an installation',
    description: 'Arrange brackets, mounts, and hardware into a concept.',
    detail: 'Begin with relevant mounting components and a review-friendly workbench. Use the scene to communicate layout before detailed CAD.',
    steps: ['Choose a concept setup', 'Arrange components', 'Review the layout'],
    templates: ['bracket-mount-concept', 'product-base-display', 'workbench-review-scene'],
  },
  {
    id: 'part', number: '04', title: 'Make an installation part',
    description: 'Create dimensioned geometry for a part you can inspect and print.',
    detail: 'Choose a part, enter its measurements, then validate and download geometry for review in your CAD and slicer tools.',
    steps: ['Choose a part', 'Enter dimensions', 'Validate and download'],
    templates: [],
  },
  {
    id: 'explore', number: '05', title: 'Explore freely',
    description: 'Open a blank workbench and build a scene from scratch.',
    detail: 'Start with an empty scene and use the full object, material, and camera toolset without a predefined layout.',
    steps: ['Open a blank scene', 'Add objects or models', 'Save your work'],
    templates: ['blank-studio'],
  },
];

export function isStudioGoal(value: string): value is StudioGoalId {
  return goals.some((goal) => goal.id === value);
}

interface Props {
  goal: StudioGoalId | null;
  projectTitle: string;
  pendingTemplateId: ProjectTemplateId | null;
  onChooseGoal: (goal: StudioGoalId) => void;
  onBack: () => void;
  onOpenWorkspace: () => void;
  onStartTemplate: (templateId: ProjectTemplateId) => void;
  onCancelTemplate: () => void;
  onConfirmTemplate: () => void;
}

export function StudioWelcome({ goal, projectTitle, pendingTemplateId, onChooseGoal, onBack, onOpenWorkspace, onStartTemplate, onCancelTemplate, onConfirmTemplate }: Props) {
  const selectedGoal = goals.find((item) => item.id === goal);
  const pendingTemplate = projectTemplates.find((item) => item.id === pendingTemplateId);

  return <section className="studio-guide" aria-label="Studio guided start">
    <div className="studio-guide-inner" inert={Boolean(pendingTemplate)}>
      <div className="studio-guide-header">
        <div className="studio-guide-brand"><span className="studio-guide-mark" aria-hidden="true">H</span><span>HALL DESIGN STUDIO <small>CREATE WITH PURPOSE</small></span></div>
        <button type="button" className="studio-guide-continue" onClick={onOpenWorkspace}>Open current workspace <span aria-hidden="true">↗</span></button>
      </div>

      {selectedGoal ? <>
        <button type="button" className="studio-guide-back" onClick={onBack}>← Change goal</button>
        <div className="studio-goal-heading"><span className="studio-guide-kicker">YOUR GOAL / {selectedGoal.number}</span><h1>{selectedGoal.title}</h1><p>{selectedGoal.detail}</p></div>
        <div className="studio-goal-steps" aria-label="Suggested workflow">{selectedGoal.steps.map((step, index) => <span key={step}><b>{String(index + 1).padStart(2, '0')}</b>{step}</span>)}</div>
        {selectedGoal.id === 'part' ? <>
          <div className="studio-template-heading"><div><span className="studio-guide-kicker">PRINTABLE PARTS</span><h2>Choose a part to make</h2></div><p>The Geometry Lab opens in a new tab on this site, leaving your current Studio scene open.</p></div>
          <div className="studio-template-grid"><a className="studio-template-card" href="spacer-ring/#design" target="_blank" rel="noopener noreferrer">
            <span className="studio-template-top"><span>AVAILABLE NOW</span><span aria-hidden="true">↗</span></span>
            <strong>Spacer ring</strong><span className="studio-template-description">Set outside diameter, opening diameter, and thickness in millimeters.</span>
            <span className="studio-template-use">VALIDATED STL + 3MF GEOMETRY</span>
          </a></div>
        </> : <>
        <div className="studio-template-heading"><div><span className="studio-guide-kicker">RECOMMENDED STARTS</span><h2>Choose a workspace built for this goal</h2></div><p>Each option opens the Studio with matching scene and export settings. You can change everything afterward.</p></div>
        <div className="studio-template-grid">{selectedGoal.templates.map((id, index) => {
          const template = projectTemplates.find((item) => item.id === id);
          if (!template) return null;
          return <button type="button" className="studio-template-card" key={id} onClick={() => onStartTemplate(id)}>
            <span className="studio-template-top"><span>{index === 0 ? 'SUGGESTED' : 'OPTION ' + String(index + 1).padStart(2, '0')}</span><span aria-hidden="true">↗</span></span>
            <strong>{template.name}</strong><span className="studio-template-description">{template.description}</span>
            <span className="studio-template-use">{template.intendedUse}</span>
          </button>;
        })}</div>
        </>}
        <p className="studio-guide-current">Current workspace: <strong>{projectTitle}</strong>. Opening it keeps the scene as it is.</p>
      </> : <>
        <div className="studio-guide-hero"><div><span className="studio-guide-kicker">A BETTER PLACE TO BEGIN</span><h1>What do you want to create?</h1><p>Tell us the goal. We’ll show you the right starting scenes and tools for it.</p><span className="studio-guide-prompt">Select a direction below ↓</span></div><div className="studio-guide-visual" aria-hidden="true"><div className="studio-guide-visual-grid" /><div className="studio-guide-visual-object"><span /></div><span className="studio-guide-visual-label">IDEA / SCENE / IMAGE</span></div></div>
        <div className="studio-goal-grid">{goals.map((item) => <button type="button" className="studio-goal-card" key={item.id} onClick={() => onChooseGoal(item.id)}><span className="studio-goal-number">{item.number}</span><strong>{item.title}</strong><span>{item.description}</span><span className="studio-goal-card-action">Explore options <b aria-hidden="true">↗</b></span></button>)}</div>
        <p className="studio-guide-current">Already working on <strong>{projectTitle}</strong>? Open the current workspace above.</p>
      </>}
    </div>
    {pendingTemplate && <div className="studio-template-confirm-backdrop">
      <section className="studio-template-confirm" role="alertdialog" aria-modal="true" aria-labelledby="studio-template-confirm-title" aria-describedby="studio-template-confirm-description" onKeyDown={(event) => { if (event.key === 'Escape') onCancelTemplate(); }}>
        <span className="studio-guide-kicker">REPLACE CURRENT SCENE?</span>
        <h2 id="studio-template-confirm-title">Start {pendingTemplate.name}?</h2>
        <p id="studio-template-confirm-description">This replaces the current “{projectTitle}” scene in this browser. Save it first if you want to keep it.</p>
        <div className="studio-template-confirm-actions">
          <button type="button" autoFocus onClick={onCancelTemplate}>Keep current scene</button>
          <button type="button" className="studio-template-confirm-primary" onClick={onConfirmTemplate}>Replace scene</button>
        </div>
      </section>
    </div>}
  </section>;
}
