import { photoProjectionReport } from '../tests/helpers/photoProjectionFixtures.ts';

// Run from experiments/spacer-ring:
//   node scripts/photoProjectionReport.ts          (Markdown table)
//   node scripts/photoProjectionReport.ts --json   (full reproducible scene/result data)
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--json')) {
  console.error('Usage: node scripts/photoProjectionReport.ts [--json]');
  process.exitCode = 1;
} else {
  const report = photoProjectionReport();
  if (args[0] === '--json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('Deterministic ideal-pinhole examples; true target length is 150 mm in every row.');
    console.log('The returned interval covers selection/reference uncertainty only. These cases are not a general accuracy claim.');
    console.log('Yaw is about Y, followed by pitch about X. See --json for physical placements, orientations, depth and image size.');
    console.log('');
    console.log('| Case | Yaw/pitch deg | Distance mm | Ref/target px | Endpoint error/allowance px | Estimate mm | Bias % | Range mm | Contains truth |');
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|:---:|');
    for (const row of report.rows) {
      console.log(`| ${row.id} | ${row.yawDeg}/${row.pitchDeg} | ${row.cameraDistanceMm} | ${row.referencePixels.toFixed(1)}/${row.targetPixels.toFixed(1)} | ${row.maximumEndpointErrorPx.toFixed(2)}/${row.endpointAllowancePx.toFixed(2)} | ${row.estimateMm.toFixed(3)} | ${row.biasPercent.toFixed(3)} | ${row.lowerMm.toFixed(3)}–${row.upperMm.toFixed(3)} | ${row.rangeContainsTruth ? 'yes' : 'no'} |`);
    }
  }
}
