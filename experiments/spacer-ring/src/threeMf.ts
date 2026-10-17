import type { Artifact } from './export.ts';
import { readBinaryStl, validateRing } from './validation.ts';
import { encodeZip } from './zip.ts';

const encoder = new TextEncoder();
const MODEL_NAMESPACE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const MODEL_CONTENT_TYPE = 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml';
const START_PART_TYPE = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel';

function escapeXml(value: string): string {
  for (const character of value) {
    const point = character.codePointAt(0)!;
    if (!(point === 9 || point === 10 || point === 13 || (point >= 0x20 && point <= 0xD7FF) ||
      (point >= 0xE000 && point <= 0xFFFD) || (point >= 0x10000 && point <= 0x10FFFF))) {
      throw new Error('Project name contains a character XML cannot represent.');
    }
  }
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function createThreeMfArtifact(artifact: Artifact, name: string): { bytes: Uint8Array; baseName: string } {
  if (typeof name !== 'string' || !name.trim() || Array.from(name.trim()).length > 120) throw new Error('Project name must be 1–120 characters.');
  const parameters = { ...artifact.report.parameters };
  validateRing(artifact.mesh, parameters);
  const decoded = readBinaryStl(artifact.bytes);
  validateRing(decoded, parameters);
  artifact.mesh.triangles.forEach((triangle, i) => triangle.forEach((index, j) => {
    const actual = decoded.vertices[decoded.triangles[i][j]];
    if (actual.some((coordinate, axis) => coordinate !== Math.fround(artifact.mesh.vertices[index][axis]))) {
      throw new Error('Source mesh and STL triangle stream do not match.');
    }
  }));

  const vertices = decoded.vertices.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join('');
  const triangles = decoded.triangles.map(([v1, v2, v3]) => `<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`).join('');
  const model = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<model xmlns="${MODEL_NAMESPACE}" unit="millimeter" xml:lang="en-US">` +
    `<metadata name="Title">${escapeXml(name.trim())}</metadata>` +
    `<resources><object id="1" type="model"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object></resources>` +
    `<build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/></build></model>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="model" ContentType="${MODEL_CONTENT_TYPE}"/></Types>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rel0" Type="${START_PART_TYPE}" Target="/3D/3dmodel.model"/></Relationships>`;
  const bytes = encodeZip({
    '[Content_Types].xml': encoder.encode(contentTypes),
    '_rels/.rels': encoder.encode(relationships),
    '3D/3dmodel.model': encoder.encode(model),
  });
  return { bytes, baseName: artifact.baseName };
}
