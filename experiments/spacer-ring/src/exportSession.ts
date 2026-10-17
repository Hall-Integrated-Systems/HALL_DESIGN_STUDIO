/** Tracks the input revision shared by all export formats and pending digests. */
export class ExportSession {
  private revision = 0;

  begin(): number { return this.revision; }
  invalidate(): void { this.revision += 1; }
  isCurrent(revision: number): boolean { return Number.isInteger(revision) && revision === this.revision; }
}
