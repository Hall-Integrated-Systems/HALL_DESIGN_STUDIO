"""Independent, standard-library inspection of this experiment's binary ring STL.

Usage: python scripts/inspect_stl.py FILE.stl OD_mm ID_mm thickness_mm
This does not import the TypeScript generator or its validation code.
"""
import collections
import hashlib
import json
import math
import pathlib
import struct
import sys


def inspect(path, outer, inner, height):
    data = pathlib.Path(path).read_bytes()
    if len(data) < 84:
        raise ValueError("Truncated header")
    count = struct.unpack_from("<I", data, 80)[0]
    if len(data) != 84 + 50 * count:
        raise ValueError("Incorrect STL byte length")
    facets = [struct.unpack_from("<12fH", data, 84 + 50 * i) for i in range(count)]
    points = [tuple(f[i:i + 3]) for f in facets for i in (3, 6, 9)]
    if not all(math.isfinite(x) for p in points for x in p):
        raise ValueError("Non-finite coordinate")
    bounds = [(min(p[a] for p in points), max(p[a] for p in points)) for a in range(3)]
    expected = [(-outer / 2, outer / 2), (-outer / 2, outer / 2), (0, height)]
    if any(abs(a - b) > 0.0001 for actual, wanted in zip(bounds, expected) for a, b in zip(actual, wanted)):
        raise ValueError("Incorrect dimensions, units, or origin")
    if any(min(abs(math.hypot(p[0], p[1]) - outer / 2), abs(math.hypot(p[0], p[1]) - inner / 2)) > 0.0001 for p in points):
        raise ValueError("Incorrect opening or outer radius")
    edges = collections.Counter()
    directed = collections.Counter()
    volume = 0
    for offset in range(0, len(points), 3):
        a, b, c = points[offset:offset + 3]
        cross_bc = (b[1]*c[2]-b[2]*c[1], b[2]*c[0]-b[0]*c[2], b[0]*c[1]-b[1]*c[0])
        volume += sum(x * y for x, y in zip(a, cross_bc)) / 6
        for p, q in ((a, b), (b, c), (c, a)):
            edges[tuple(sorted((p, q)))] += 1
            directed[(p, q)] += 1
    if any(c != 2 for c in edges.values()) or any(c != directed[(q, p)] for (p, q), c in directed.items()):
        raise ValueError("Open, non-manifold, or inconsistently wound surface")
    euler = len(set(points)) - len(edges) + count
    if euler != 0 or volume <= 0:
        raise ValueError("Incorrect ring topology or volume orientation")
    # Actual minimum polygonal bore diameter from the decoded bottom ring edge chords.
    inner_points = sorted({(p[0], p[1]) for p in points if p[2] == 0 and abs(math.hypot(p[0], p[1]) - inner / 2) < 0.0001}, key=lambda p: math.atan2(p[1], p[0]))
    across_flats = min(2 * abs(a[0]*b[1] - a[1]*b[0]) / math.dist(a, b) for a, b in zip(inner_points, inner_points[1:] + inner_points[:1]))
    return {"inspector": "independent Python standard-library reader", "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "triangles": count, "unique_vertices": len(set(points)), "edges": len(edges), "euler_characteristic": euler, "bounds_mm": bounds, "volume_mm3": volume, "minimum_opening_across_flats_mm": across_flats, "edge_closure_and_winding": "pass", "dimensions": "pass"}


if __name__ == "__main__":
    if len(sys.argv) != 5:
        raise SystemExit("Usage: python scripts/inspect_stl.py FILE.stl OD_mm ID_mm thickness_mm")
    print(json.dumps(inspect(sys.argv[1], *map(float, sys.argv[2:])), indent=2))
