import test from 'node:test';
import assert from 'node:assert/strict';
import { studioHasWebGL2 } from '../src/utils/studioGraphics.ts';

test('staging detects unavailable WebGL without throwing', () => {
  assert.equal(studioHasWebGL2(() => ({ getContext: () => null }) as unknown as HTMLCanvasElement), false);
  assert.equal(studioHasWebGL2(() => { throw new Error('blocked'); }), false);
});

test('staging releases its temporary probe when WebGL is available', () => {
  let released = false;
  const canvas = { getContext: () => ({ getExtension: () => ({ loseContext: () => { released = true; } }) }) } as unknown as HTMLCanvasElement;
  assert.equal(studioHasWebGL2(() => canvas), true);
  assert.equal(released, true);
});

test('staging does not treat an unavailable cleanup extension as a graphics failure', () => {
  const canvas = { getContext: () => ({ getExtension: () => { throw new Error('unavailable'); } }) } as unknown as HTMLCanvasElement;
  assert.equal(studioHasWebGL2(() => canvas), true);
});
