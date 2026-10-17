import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RingWorkflow } from '../src/exportWorkflow.ts';

// Usage: npm run demo -- [OD_mm ID_mm thickness_mm [output-directory]]
const args = process.argv.slice(2);
try {
  if (![0, 3, 4].includes(args.length)) throw new Error('Usage: npm run demo -- [OD_mm ID_mm thickness_mm [output-directory]]');
  const workflow = new RingWorkflow();
  if (args.length) {
    const dimensions = { outerDiameterMm: Number(args[0]), innerDiameterMm: Number(args[1]), thicknessMm: Number(args[2]) };
    workflow.generate(dimensions, `HIS Spacer Ring OD${dimensions.outerDiameterMm} ID${dimensions.innerDiameterMm} H${dimensions.thicknessMm}`, 'user-entered');
  }
  const artifact = workflow.artifact!;
  const stl = await workflow.prepareExport('stl');
  const threeMf = await workflow.prepareExport('3mf');
  const output = resolve(args[3] ?? 'output');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, stl.filename), stl.bytes);
  await writeFile(resolve(output, threeMf.filename), threeMf.bytes);
  await writeFile(resolve(output, `${artifact.baseName}.his-ring.json`), workflow.saveProject());
  await writeFile(resolve(output, stl.reportFilename), JSON.stringify(stl.report, null, 2) + '\n');
  await writeFile(resolve(output, threeMf.reportFilename), JSON.stringify(threeMf.report, null, 2) + '\n');
  // Preserve the v0.1 validation report path and contents for existing consumers.
  const report = { ...artifact.report, sha256: stl.report.sha256 };
  await writeFile(resolve(output, `${artifact.baseName}.validation.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output, filename: `${artifact.baseName}.stl`, sha256: report.sha256, ...report.roundTrip }, null, 2));
} catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; }
