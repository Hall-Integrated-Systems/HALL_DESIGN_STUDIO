import { projectTemplates } from '../config/projectTemplates';
import type { ProjectTemplateDefinition } from '../config/projectTemplates';
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
    description: 'Create a spacer ring or a speaker mounting plate.',
    detail: 'Choose a part and we’ll help you enter the measurements. Review the design and check the fit with your actual parts.',
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

function PartIllustration({ kind }: { kind: 'plate' | 'ring' }) {
  return <svg className="studio-part-art" viewBox="0 0 320 180" aria-hidden="true" focusable="false">
    <ellipse cx="160" cy="151" rx="118" ry="13" fill="#040c15" opacity=".35" />
    <ellipse cx="160" cy="99" rx="96" ry="52" fill="#0a2337" stroke="#2b6f9e" strokeWidth="3" />
    <path d="M64 82v17c0 29 43 52 96 52s96-23 96-52V82" fill="#16476a" stroke="#2b6f9e" strokeWidth="3" />
    <ellipse cx="160" cy="82" rx="96" ry="52" fill="#347fa9" stroke="#9cddf6" strokeWidth="3" />
    <ellipse cx="160" cy="83" rx={kind === 'plate' ? 39 : 53} ry={kind === 'plate' ? 21 : 28} fill="#071726" stroke="#b4e4f4" strokeWidth="3" />
    {kind === 'plate' && <g>
      <ellipse cx="160" cy="42" rx="5" ry="3" fill="#071726" stroke="#ffce6b" strokeWidth="2" />
      <ellipse cx="233" cy="82" rx="5" ry="3" fill="#071726" stroke="#ffce6b" strokeWidth="2" />
      <ellipse cx="160" cy="122" rx="5" ry="3" fill="#071726" stroke="#ffce6b" strokeWidth="2" />
      <ellipse cx="87" cy="82" rx="5" ry="3" fill="#071726" stroke="#ffce6b" strokeWidth="2" />
      <ellipse cx="125" cy="57" rx="4" ry="2.5" fill="#071726" stroke="#9eefff" strokeWidth="2" />
      <ellipse cx="195" cy="57" rx="4" ry="2.5" fill="#071726" stroke="#9eefff" strokeWidth="2" />
      <ellipse cx="125" cy="108" rx="4" ry="2.5" fill="#071726" stroke="#9eefff" strokeWidth="2" />
      <ellipse cx="195" cy="108" rx="4" ry="2.5" fill="#071726" stroke="#9eefff" strokeWidth="2" />
    </g>}
  </svg>;
}

function TemplatePreview({ template }: { template: ProjectTemplateDefinition }) {
  const shape = template.recommendedExportSize === 'hd-1920' ? 'wide' : template.recommendedExportSize === 'viewport' ? 'viewport' : 'square';
  const illustrated = ['product-base-display', 'bracket-mount-concept', 'logo-hero-render', 'workbench-review-scene'].includes(template.id);
  const label = template.id === 'product-base-display' ? 'Base plate and display stand'
    : template.id === 'bracket-mount-concept' ? 'Mount plate, bracket and screw boss'
      : template.id === 'logo-hero-render' ? 'H logo placeholder'
        : template.id === 'workbench-review-scene' ? 'Base plate and label tag'
          : template.starterAssetIds.length ? 'Starter assets; inspect the template' : 'Empty scene; add your own content';
  return <span className="studio-template-preview">
    <span className={'studio-template-preview-scene studio-preview-' + template.backgroundMode + ' studio-preview-' + shape + (template.settings.gridVisible ? ' studio-preview-grid' : '')} aria-hidden="true">
      {illustrated && <svg viewBox="0 0 150 90" focusable="false">
        {template.id === 'product-base-display' && <g>
          <rect x="25" y="68" width="100" height="9" rx="2" fill="#3d4c57" />
          <ellipse cx="75" cy="65" rx="18" ry="5" fill="#8d9da5" />
          <rect x="71" y="32" width="8" height="33" fill="#8d9da5" />
          <rect x="56" y="27" width="38" height="6" rx="2" fill="#9faeb5" />
        </g>}
        {template.id === 'bracket-mount-concept' && <g>
          <rect x="26" y="21" width="52" height="42" rx="3" fill="#9aaab1" />
          <circle cx="52" cy="30" r="2.5" fill="#273640" /><circle cx="52" cy="54" r="2.5" fill="#273640" />
          <path d="M84 29h7v29h24v8H84z" fill="#4c5b64" />
          <ellipse cx="112" cy="39" rx="8" ry="4" fill="#8fa0a8" /><rect x="104" y="39" width="16" height="13" fill="#8fa0a8" /><ellipse cx="112" cy="39" rx="3" ry="1.5" fill="#263642" />
        </g>}
        {template.id === 'logo-hero-render' && <g fill="#4ea7e3">
          <rect x="48" y="17" width="12" height="55" rx="1" /><rect x="90" y="17" width="12" height="55" rx="1" /><rect x="60" y="39" width="30" height="11" rx="1" />
        </g>}
        {template.id === 'workbench-review-scene' && <g>
          <rect x="22" y="55" width="72" height="13" rx="2" fill="#455b67" />
          <rect x="93" y="26" width="36" height="22" rx="2" fill="#e7eff0" />
          <rect x="98" y="31" width="26" height="4" fill="#4e9acc" />
        </g>}
      </svg>}
    </span>
    <small>Illustration: {label}</small>
  </span>;
}

function PartChoices() {
  return <div className="studio-part-choices">
    <a className="studio-part-card studio-part-card-plate" href="spacer-ring/#plate" target="_blank" rel="noopener noreferrer">
      <div className="studio-part-card-art"><PartIllustration kind="plate" /><span>CONCEPT ILLUSTRATION</span></div>
      <div className="studio-part-card-copy">
        <span className="studio-part-card-category">SPEAKER FITMENT</span>
        <strong>Speaker mounting plate</strong>
        <span>Connect a round speaker to a round opening with separate speaker and vehicle screw patterns.</span>
        <span className="studio-part-card-action">Start a mounting plate <small>Opens in a new tab</small></span>
      </div>
    </a>
    <a className="studio-part-card studio-part-card-ring" href="spacer-ring/#design" target="_blank" rel="noopener noreferrer">
      <div className="studio-part-card-art"><PartIllustration kind="ring" /><span>CONCEPT ILLUSTRATION</span></div>
      <div className="studio-part-card-copy">
        <span className="studio-part-card-category">MAKE SPACE</span>
        <strong>Spacer ring</strong>
        <span>Create a plain ring around an opening using your outside diameter, opening and thickness.</span>
        <span className="studio-part-card-action">Start a spacer ring <small>Opens in a new tab</small></span>
      </div>
    </a>
  </div>;
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
          <div className="studio-template-heading"><div><span className="studio-guide-kicker">INSTALLATION PARTS</span><h2>Choose a part to make</h2></div><p>Your current workspace stays open. Check the design and fit with your actual parts.</p></div>
          <PartChoices />
        </> : <>
        <div className="studio-template-heading"><div><span className="studio-guide-kicker">RECOMMENDED STARTS</span><h2>Choose a workspace built for this goal</h2></div><p>Each option opens the Studio with matching scene and export settings. You can change everything afterward.</p></div>
        <div className="studio-template-grid">{selectedGoal.templates.map((id, index) => {
          const template = projectTemplates.find((item) => item.id === id);
          if (!template) return null;
          return <button type="button" className="studio-template-card" key={id} onClick={() => onStartTemplate(id)}>
            <TemplatePreview template={template} />
            <span className="studio-template-top"><span>{index === 0 ? 'SUGGESTED' : 'OPTION ' + String(index + 1).padStart(2, '0')}</span><span aria-hidden="true">↗</span></span>
            <strong>{template.name}</strong><span className="studio-template-description">{template.description}</span>
            <span className="studio-template-use">{template.intendedUse}</span>
          </button>;
        })}</div>
        </>}
        <p className="studio-guide-current">Current workspace: <strong>{projectTitle}</strong>. Opening it keeps the scene as it is.</p>
      </> : <>
        <div className="studio-customer-hero">
          <div className="studio-customer-hero-copy">
            <span className="studio-guide-kicker">HALL INTEGRATED SYSTEMS / DESIGN STUDIO</span>
            <h1>Make room for a better install.</h1>
            <p>Start with a speaker mounting plate or spacer ring. We’ll help you understand the measurements and review your design.</p>
            <div className="studio-customer-steps" aria-label="How it works">
              <span><b>01</b> Choose a part</span>
              <span><b>02</b> Enter measurements</span>
              <span><b>03</b> Review next steps</span>
            </div>
          </div>
          <div className="studio-customer-hero-art">
            <div className="studio-customer-hero-art-top"><span>FROM IDEA TO PART</span><span>HIS / STUDIO</span></div>
            <PartIllustration kind="plate" />
            <p>Concept illustration. Your design is based on the measurements you enter.</p>
          </div>
        </div>
        <div className="studio-customer-heading">
          <div><span className="studio-guide-kicker">PICK YOUR STARTING POINT</span><h2>What are you working on?</h2></div>
          <p>Choose a part to explore it with guided measurements.</p>
        </div>
        <PartChoices />
        <section className="studio-customer-help" aria-labelledby="studio-help-title">
          <div className="studio-customer-help-icon" aria-hidden="true">?</div>
          <div><h2 id="studio-help-title">Need help choosing?</h2><p>Have an unusual opening or still gathering measurements? Tell us about your installation.</p></div>
          <a href="https://hallintegratedsystems.com/contact.html" target="_blank" rel="noopener noreferrer">Ask HIS for help <small>Opens in a new tab</small></a>
        </section>
        <p className="studio-guide-current studio-customer-note">Start with example dimensions, then check your measurements and fit against your actual parts and a physical test print.</p>
        <details className="studio-visualization"><summary><span>Visualization workspace</span><small>Create product images and installation concepts</small></summary><p className="studio-guide-current">These scenes help you visualize ideas; they do not create printable geometry.</p><div className="studio-goal-grid">{goals.filter((item) => item.id !== 'part').map((item) => <button type="button" className="studio-goal-card" key={item.id} onClick={() => onChooseGoal(item.id)}><span className="studio-goal-number">{item.number}</span><strong>{item.title}</strong><span>{item.description}</span><span className="studio-goal-card-action">Explore options</span></button>)}</div></details>
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
