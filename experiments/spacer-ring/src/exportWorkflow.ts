import { DEMO_DIMENSIONS } from './geometry.ts';
import type { RingDimensions } from './geometry.ts';
import { createArtifact } from './export.ts';
import type { Artifact } from './export.ts';
import { ExportSession } from './exportSession.ts';
import { createExportReport } from './integrity.ts';
import type { ExportFormat, ExportReport } from './integrity.ts';
import { createProject, parseProject, serializeProject } from './project.ts';
import type { RingProject } from './project.ts';
import { createThreeMfArtifact } from './threeMf.ts';

export interface PreparedExport {
  bytes: Uint8Array;
  filename: string;
  report: ExportReport;
  reportFilename: string;
  revision: number;
}

/** Owns the validated project/artifact pair; UI changes invalidate pending exports synchronously. */
export class RingWorkflow {
  private session = new ExportSession();
  project: RingProject = createProject(DEMO_DIMENSIONS, 'HIS Spacer Ring Demo', 'demo');
  artifact: Artifact | null = createArtifact(DEMO_DIMENSIONS);

  revision(): number { return this.session.begin(); }
  isCurrent(revision: number): boolean { return this.session.isCurrent(revision) && this.artifact !== null; }
  edit(): void { this.session.invalidate(); this.artifact = null; }
  rename(): void { this.edit(); }

  generate(dimensions: RingDimensions, name: string, origin: RingProject['provenance']['origin'], note?: string): void {
    const project = createProject(dimensions, name, origin, note);
    const artifact = createArtifact(project.dimensions);
    this.session.invalidate();
    this.project = project;
    this.artifact = artifact;
  }

  loadProject(json: string): void {
    // Parse and build completely before replacing the current project.
    const project = parseProject(json);
    const artifact = createArtifact(project.dimensions);
    this.session.invalidate();
    this.project = project;
    this.artifact = artifact;
  }

  saveProject(): string {
    if (!this.artifact) throw new Error('Generate and validate the current dimensions before saving.');
    return serializeProject(this.project);
  }

  async prepareExport(format: ExportFormat): Promise<PreparedExport> {
    const revision = this.session.begin();
    const artifact = this.artifact;
    if (!artifact) throw new Error('Generate and validate the current dimensions before exporting.');
    const bytes = format === 'stl' ? artifact.bytes.slice() : createThreeMfArtifact(artifact, this.project.name).bytes;
    const checks = format === 'stl'
      ? ['source mesh dimensions and topology', 'binary STL re-read, float32 coordinates and topology', 'SHA-256 of export bytes']
      : ['source mesh dimensions and topology', 'binary STL re-read and float32 correspondence', '3MF written from rechecked STL triangle stream', 'SHA-256 of export bytes'];
    const report = await createExportReport(bytes, format, artifact.report.parameters, checks);
    if (!this.isCurrent(revision) || this.artifact !== artifact) throw new Error('Inputs changed while the export digest was pending. Generate again.');
    return { bytes, filename: `${artifact.baseName}.${format}`, report, reportFilename: `${artifact.baseName}.${format}.report.json`, revision };
  }
}
