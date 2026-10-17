"""Independent standard-library inspection of a bounded geometry-only ring 3MF.

Usage: python scripts/inspect_3mf.py FILE.3mf MATCHING.stl OD ID HEIGHT
No archive member is extracted to disk and no external XML resource is resolved.
"""
import collections
import json
import math
import pathlib
import re
import struct
import sys
import xml.etree.ElementTree as ET
import zipfile

from inspect_stl import inspect as inspect_stl

MODEL_NS = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02"
CONTENT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
MODEL_TYPE = "application/vnd.ms-package.3dmanufacturing-3dmodel+xml"
REL_CONTENT_TYPE = "application/vnd.openxmlformats-package.relationships+xml"
START_TYPE = "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"
PARTS = {"[Content_Types].xml", "_rels/.rels", "3D/3dmodel.model"}
EPS = 0.0001


def require(condition, message):
    if not condition:
        raise ValueError(message)


def xml_root(data):
    upper = data.upper()
    require(b"<!DOCTYPE" not in upper and b"<!ENTITY" not in upper, "External XML declarations are not allowed")
    return ET.fromstring(data)


def archive_parts(path):
    require(path.stat().st_size <= 8 * 1024 * 1024, "3MF compressed size exceeds 8 MiB")
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        names = [item.filename for item in members]
        require(len(members) <= 16, "Too many ZIP members")
        require(len(names) == len(set(names)), "Duplicate ZIP part name")
        require(set(names) == PARTS, "Missing or unexpected 3MF part")
        require(sum(item.file_size for item in members) <= 16 * 1024 * 1024, "Declared uncompressed size exceeds 16 MiB")
        require(all(not item.is_dir() and not item.flag_bits & 1 for item in members), "Directory or encrypted ZIP member")
        # zipfile.read checks CRC as each bounded member is consumed.
        return {item.filename: archive.read(item) for item in members}


def inspect(path, stl_path, outer, inner, height):
    require(all(math.isfinite(x) for x in (outer, inner, height)) and 2 <= outer <= 1000 and 1 <= inner <= outer - 0.4 and 0.2 <= height <= 250, "Invalid expected dimensions")
    parts = archive_parts(path)
    types = xml_root(parts["[Content_Types].xml"])
    require(types.tag == f"{{{CONTENT_NS}}}Types", "Invalid content-type root")
    defaults = types.findall(f"{{{CONTENT_NS}}}Default")
    require(len(defaults) == 2 and len(types) == 2, "Unexpected content-type entries")
    content_map = {item.get("Extension"): item.get("ContentType") for item in defaults}
    require(content_map == {"rels": REL_CONTENT_TYPE, "model": MODEL_TYPE}, "Invalid 3MF content types")

    relations = xml_root(parts["_rels/.rels"])
    require(relations.tag == f"{{{REL_NS}}}Relationships", "Invalid relationship root")
    links = relations.findall(f"{{{REL_NS}}}Relationship")
    require(len(links) == 1 and len(relations) == 1, "Expected one package relationship")
    link = links[0]
    require(link.get("Type") == START_TYPE and link.get("TargetMode") is None, "Invalid or external 3MF relationship")
    target = link.get("Target")
    require(target == "/3D/3dmodel.model" and target.lstrip("/") in parts, "Missing relationship target")

    model = xml_root(parts[target.lstrip("/")])
    q = lambda tag: f"{{{MODEL_NS}}}{tag}"
    require(model.tag == q("model") and model.get("unit") == "millimeter", "Model unit must be millimeter")
    require(len(model) == 3 and [child.tag for child in model] ==
            [q("metadata"), q("resources"), q("build")], "Expected one title, resources, and build")
    metadata, resources, build = model
    require(metadata.get("name") == "Title" and len(metadata) == 0, "Expected one literal title")
    title = metadata.text or ""
    objects = resources.findall(q("object"))
    items = build.findall(q("item"))
    require(len(objects) == 1 and len(resources) == 1 and len(items) == 1 and len(build) == 1, "Expected one mesh object and build item")
    obj = objects[0]
    object_id = obj.get("id")
    require(obj.get("type") == "model" and object_id is not None and
            re.fullmatch(r"[1-9][0-9]*", object_id) is not None and
            items[0].get("objectid") == object_id, "Invalid build reference")
    transform = items[0].get("transform")
    require(transform is not None and [float(x) for x in transform.split()] == [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], "Build placement is not identity")
    require(len(obj) == 1 and obj[0].tag == q("mesh"), "Expected one mesh")
    mesh = obj[0]
    require(len(mesh) == 2 and [child.tag for child in mesh] ==
            [q("vertices"), q("triangles")], "Expected vertices and triangles")
    vertex_group, triangle_group = mesh
    vertices = []
    for item in vertex_group:
        require(item.tag == q("vertex"), "Invalid vertex element")
        point = tuple(float(item.attrib[axis]) for axis in "xyz")
        require(all(math.isfinite(value) for value in point), "Non-finite vertex")
        vertices.append(point)
    triangles = []
    for item in triangle_group:
        require(item.tag == q("triangle"), "Invalid triangle element")
        face = tuple(int(item.attrib[f"v{axis}"]) for axis in (1, 2, 3))
        require(len(set(face)) == 3 and all(0 <= index < len(vertices) for index in face), "Invalid triangle index")
        triangles.append(face)
    require(vertices and triangles and len(set(vertices)) == len(vertices), "Empty mesh or duplicate vertex")
    require(len(set(tuple(sorted(face)) for face in triangles)) == len(triangles), "Duplicate triangle")

    bounds = [(min(vertex[axis] for vertex in vertices), max(vertex[axis] for vertex in vertices)) for axis in range(3)]
    expected = [(-outer / 2, outer / 2), (-outer / 2, outer / 2), (0, height)]
    require(all(abs(actual - wanted) <= EPS for axis in range(3) for actual, wanted in zip(bounds[axis], expected[axis])), "Incorrect dimensions, units, or origin")
    require(all(min(abs(math.hypot(x, y) - outer / 2), abs(math.hypot(x, y) - inner / 2)) <= EPS for x, y, _ in vertices), "Incorrect radii")
    edges = collections.Counter()
    directions = collections.Counter()
    neighbors = [set() for _ in vertices]
    volume = 0.0
    for face in triangles:
        a, b, c = (vertices[index] for index in face)
        cross_bc = (b[1]*c[2]-b[2]*c[1], b[2]*c[0]-b[0]*c[2], b[0]*c[1]-b[1]*c[0])
        volume += sum(x*y for x, y in zip(a, cross_bc)) / 6
        for u, v in zip(face, face[1:] + face[:1]):
            edges[tuple(sorted((u, v)))] += 1
            directions[(u, v)] += 1
            neighbors[u].add(v)
            neighbors[v].add(u)
    require(all(count == 2 for count in edges.values()) and all(count == directions[(v, u)] for (u, v), count in directions.items()), "Open or inconsistently wound mesh")
    seen = set()
    queue = [0]
    while queue:
        index = queue.pop()
        if index in seen:
            continue
        seen.add(index)
        queue.extend(neighbors[index] - seen)
    require(len(seen) == len(vertices), "Disconnected mesh")
    require(len(vertices) - len(edges) + len(triangles) == 0 and volume > 0, "Incorrect through-hole topology or volume")
    inner_points = sorted({(x, y) for x, y, z in vertices if abs(z) <= EPS and abs(math.hypot(x, y) - inner / 2) <= EPS}, key=lambda p: math.atan2(p[1], p[0]))
    require(len(inner_points) >= 64, "Central opening missing")
    across_flats = min(2 * abs(a[0]*b[1]-a[1]*b[0]) / math.dist(a, b) for a, b in zip(inner_points, inner_points[1:] + inner_points[:1]))
    require(inner - 0.041 <= across_flats <= inner + EPS, "Central opening across flats is wrong")

    stl_report = inspect_stl(stl_path, outer, inner, height)
    stl = pathlib.Path(stl_path).read_bytes()
    count = struct.unpack_from("<I", stl, 80)[0]
    require(count == len(triangles), "STL and 3MF triangle counts differ")
    for face_number, face in enumerate(triangles):
        facet = struct.unpack_from("<12fH", stl, 84 + 50 * face_number)
        stl_points = [facet[offset:offset + 3] for offset in (3, 6, 9)]
        for index, point in zip(face, stl_points):
            require(all(abs(a - b) <= EPS for a, b in zip(vertices[index], point)), "3MF and STL triangle coordinates differ")
    return {"inspector": "independent Python zipfile and ElementTree reader", "units": "millimeter", "title": title,
            "objects": 1, "build_items": 1, "vertices": len(vertices), "triangles": len(triangles), "bounds_mm": bounds,
            "volume_mm3": volume, "minimum_opening_across_flats_mm": across_flats, "central_opening": "pass",
            "closure_winding_connectedness": "pass", "cross_format_triangle_match": "pass", "matching_stl_sha256": stl_report["sha256"]}


if __name__ == "__main__":
    try:
        require(len(sys.argv) == 6, "Usage: python scripts/inspect_3mf.py FILE.3mf MATCHING.stl OD ID HEIGHT")
        print(json.dumps(inspect(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), *map(float, sys.argv[3:])), indent=2))
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        sys.exit(1)
