# Spacer Ring Lab photo measurement reliability

Photo estimates are provisional planning inputs. The tool measures a pixel-distance ratio; it does not recover camera pose, rectify a plane, calibrate a lens, or establish manufacturing accuracy. A checked setup box is an operator acknowledgement, not proof of coplanarity or perpendicularity. Geometry/export validation checks the generated geometry against its inputs, not those inputs against the physical part.

## Reproduce the investigation

Use the repository lockfile and Node >=22.18:

```sh
npm ci
cd experiments/spacer-ring
npm test
node scripts/photoProjectionReport.ts
node scripts/photoProjectionReport.ts --json
npm run typecheck
npm run build
cd ../..
npm run build
```

`tests/helpers/photoProjectionFixtures.ts` renders physical 100 mm reference and 150 mm target segments into an ideal pinhole image. It rotates the plane about Y (yaw), then X (pitch), translates it in front of the camera, and projects each endpoint using `u = cx + f X/Z`, `v = cy + f Y/Z`. Segment orientation and in-plane center are independent; an additional optical-axis displacement tests plane mismatch. The base camera has focal length 2400 pixels, a 4000×3000 image, and 1000 mm distance. Each JSON row includes its actual camera and segment configuration, known truth, estimate, bias, assumed interval, and whether that interval contains truth. Alternative focal scales, distances, endpoint offsets, rounding, and reference errors are explicit per scenario.

The renderer is independent of the estimator. Sanity tests check analytic frontal scaling, inverse-depth scaling, rotated physical lengths, and a closed-form centered yaw case. The error sweep tests 8 radial directions at a 2-pixel radius for each of four endpoints: 8^4 = 4096 deterministic combinations. These are controlled examples, not a random sample, coverage probability, or validation of a real camera. Lens distortion, blur, occlusion, edge interpretation, and physical operator performance are not simulated.

The camera model follows the [OpenCV pinhole-camera documentation](https://docs.opencv.org/4.5.5/d9/d0c/group__calib3d.html); OpenCV is a methodological reference, not a project dependency.

## Observed failures and favorable conditions

Every row below has a true target length of 150 mm. Unless stated otherwise, endpoints are exact and the estimator uses its legacy ±2 original-image-pixel allowance. Ranges are rounded for presentation. Use the JSON for detailed results and the fixtures for exact inputs.

| Controlled case | Estimate, mm | Selection/reference range, mm | Contains 150 mm? |
|---|---:|---:|:---:|
| Frontal, parallel spans | 150.000 | 145.902–154.237 | Yes |
| 5° yaw, separated spans, focal scale 2400 px | 155.326 | 151.052–159.747 | No |
| Same 5° scene, focal scale 800 px | 155.326 | 142.920–169.066 | Yes |
| 30° yaw, separated coplanar parallel spans | 183.423 | 177.544–189.557 | No |
| 30° pitch, separated coplanar vertical spans | 122.861 | 119.059–126.797 | No |
| 45° yaw, centered cross-axis reference | 211.867 | 204.694–219.385 | No |
| 45° yaw, reversed reference/target axes | 106.365 | 102.982–109.863 | No |
| 30° yaw, reference moved close to target | 153.153 | 148.329–158.168 | Yes |
| Target 100 mm nearer than reference at 1000 mm | 166.667 | 162.295–171.186 | No |
| Target 100 mm farther than reference at 1000 mm | 136.364 | 132.489–140.370 | No |
| Frontal, adversarial 3-pixel endpoint errors | 156.410 | 152.101–160.870 | No |
| 2 displayed-pixel errors, original 2-pixel allowance | 169.231 | 166.362–172.162 | No |
| Same displayed-pixel errors, corrected 14.286-pixel allowance | 169.231 | 150.000–191.667 | Yes |

The report also sweeps yaw at 0°, 5°, 10°, 15°, and 20° for fixed placements at focal scales 2400 and 800 pixels. The first sampled interval miss occurs at 5° and 15° respectively. The estimate bias is identical at each matching angle; the lower-resolution interval is merely wider. These are case-specific crossovers, not safe-angle limits or an improvement in accuracy from lower resolution.

Coplanarity alone is insufficient: local scale varies across a tilted plane. Different reference and target directions can also have different foreshortening. Nearby, parallel spans reduce the mismatch in the tested scene; that example still has 2.102% bias. Its interval containing truth is not evidence that 30° is acceptable. Camera distance and pixel resolution also affect bias and interval width, so there is no universal safe angle, distance, or displayed span established here. A wide interval can contain truth while being too imprecise for a particular fit.

In the ideal frontal cases, a common scale recovers the known length exactly. With that geometry, the bounded selection-error sweep contains truth in all 4096 cases. This supports the interval calculation under its stated assumptions. It does not establish that a person can place real landmarks within the assumed allowance.

## What changed and what the validation means

The estimator still uses `referenceMm * targetPixels / referencePixels`. Its interval expands reference and target pair lengths by twice the per-endpoint radial allowance, and includes the entered reference-length uncertainty when supplied. A blank reference uncertainty means that error is omitted; it does not mean the reference is exact. The result now explicitly identifies its scope as `selection-and-reference-only`.

The API's optional `endpointUncertaintyPx` retains the default of 2 **original-image pixels** for existing callers. The panel instead starts with an adjustable allowance of 2 **displayed CSS pixels**, maps it back to original pixels using the largest axis scale recorded across all four clicks, and retains a minimum of 2 original pixels. Changing viewport size between clicks cannot discard an earlier, coarser placement scale. The allowance is assumed, not measured; increase it for uncertain edges. A marker's visual center or a high-resolution file does not prove precise placement.

For example, a 4000×3000 photo shown at 560×420 converts 2 displayed pixels into 14.285714 original pixels per endpoint. Previously the original-pixel assumption implied about 0.28 displayed pixels of placement error. The corrected range is wider; the estimate itself is unchanged.

Minimum spans retain the original selection-resolution ratios: reference ≥max(40 original pixels, 20×endpoint allowance), target ≥max(20 original pixels, 10×endpoint allowance). With the default displayed allowance and ordinary downscaling, those are 40 and 20 displayed pixels. These reject poorly resolved selections and keep the interval denominator away from zero. They do not establish useful fit precision or acceptable perspective. Nonfinite distances, invalid allowances, and nonpositive/overflowed results also reject.

The panel clears confirmation after measurement edits and invalidates landmarks after image failure. Its existing callback, project schema, dimension-entry flow, STL/3MF checks, and separate inspection workflow are unchanged. Provenance records the allowance and unquantified geometry errors without saving the photo.

## Practical capture conditions

- Place a measured, rigid reference immediately beside the measured feature, in its plane and parallel to the span. A reference on the bench below a raised part is at a different depth.
- Aim near perpendicular to that plane; keep the reference and target together near the image center. A face-on view of a ring's top does not establish thickness. Thickness needs a separate suitable view with a reference coplanar with that span, or direct caliper measurement.
- Use clear, sharply defined endpoints. For a diameter, select opposite edges through the center. Avoid oblique, blurred, occluded, or heavily wide-angle views.
- Make both spans large in the displayed image. A higher original resolution without larger displayed features does not improve manual placement. If the tool asks for a larger span, enlarge the actual view or use a better-framed photo and place all landmarks again.
- Repeat the selection and take a fresh photo with the reference repositioned. Agreement is a useful consistency check, not proof against shared bias. Disagreement is a reason to investigate and use direct measurements.

## Physical caliper verification before manufacturing

No real part or camera has been physically validated by this simulation. Use this protocol to establish evidence for the actual part and capture setup:

1. Identify the physical source or mating part, reference, photo, and intended project revision. Check caliper zero and a suitable known-length standard. Record instrument model, stated accuracy and resolution; display resolution alone is not accuracy. Use an instrument with enough range for the full span. If a feature is inaccessible or exceeds that range, obtain a suitable direct measurement before assigning a manufacturing dimension.
2. Measure the reference directly and record repeat readings and its justified uncertainty. Do not infer its exact length from an unverified printed ruler or a background object's nominal size.
3. Take at least three source-part readings per relevant feature, lifting and reseating the calipers between readings. Measure OD and ID in more than one direction, and thickness at several locations. Avoid burrs, tilted jaws, excessive pressure, and deforming soft material. Record raw readings and spread; investigate shape variation instead of averaging it away.
4. Before comparing results, define the dimension's required fit/clearance and acceptance tolerance for this design. Include instrument limitations and the manufacturing/material process. This Lab does not choose a tolerance or certify the measuring instrument.
5. Record the photo estimate, its limited interval, the source caliper readings, the signed error `estimate - direct measurement`, and absolute error. If that difference exceeds the design's allowed error, reject the photo result even if the caliper value lies inside the photo interval. If a direct reading lies outside the interval, investigate the capture/reference/landmark assumptions; enlarging the endpoint allowance does not calibrate perspective.
6. Replace provisional inputs with design dimensions based on the physical readings and explicitly chosen fit allowance. Save the final dimension project; regenerate and validate. Editing a dimension clears the old photo note in the existing workflow, so save the provisional project and a separate source-measurement log first if retaining that comparison is useful.
7. Inspect STL/3MF at millimeters and 100% scale in Fusion and QIDI Studio. After a prototype is produced, use the existing **Inspect a printed part** page with the matching nominal project to record printed OD, ID, thickness, repeated readings, instrument notes, and the actual fit decision. Post-print readings and source-part measurements are separate evidence. Preserve the inspection JSON with the project and export reports.

A useful local capture study repeats the same known feature with frontal and deliberately tilted views, nearby and separated references, parallel and cross-axis references, and a measured reference/target depth offset. Record how angles and offsets were established. Keep camera mode, distance, image/display size, endpoint allowance, reference readings, and raw caliper readings in the log. Assess errors against the actual design tolerance; do not convert a small favorable study into a general accuracy rating.

## Regression and operator checks

The automated suite includes existing geometry, STL/3MF integrity, export invalidation, project round-trip, and inspection tests alongside the new projection and numeric/selection tests.

For a rendered UI check, upload a large image, place four landmarks, and confirm the original-pixel allowance reflects its display scale. Confirm that editing reference length, reference uncertainty, endpoint allowance, target field, or landmarks clears the checkbox; a bad image must remove its proposal. Apply a proposal and confirm the designer input changes and prior exports disable. Generate again, save/load the project, and check exports and the separate inspection screen. Repeat at desktop and phone widths, including a resize between landmark placements. No result should be described as physically accepted solely because geometry/export checks pass.
