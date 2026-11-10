/** Check the graphics capability used by the 3D staging workspace. */
export function studioHasWebGL2(createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')): boolean {
  try {
    const context = createCanvas().getContext('webgl2');
    if (!context) return false;
    // Release the temporary probe so it does not consume a renderer context.
    try { context.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* The context itself was available. */ }
    return true;
  } catch {
    return false;
  }
}
