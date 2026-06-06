import type { ScreenshotSize } from '../types/studioTypes';

export const screenshotDimensions: Record<Exclude<ScreenshotSize, 'viewport'>, { width: number; height: number }> = {
  'square-1200': { width: 1200, height: 1200 },
  'hd-1920': { width: 1920, height: 1080 },
  'square-2400': { width: 2400, height: 2400 },
};

export function getScreenshotDimensions(size: ScreenshotSize, canvas: HTMLCanvasElement) {
  if (size === 'viewport') {
    return { width: canvas.width, height: canvas.height };
  }

  return screenshotDimensions[size];
}

export function sanitizeExportFileName(fileName: string) {
  const trimmed = fileName.trim();
  const base = trimmed.length > 0 ? trimmed : 'hall-product-studio-render';
  const sanitized = base
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .slice(0, 120);

  return `${sanitized || 'hall-product-studio-render'}.png`;
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.download = sanitizeExportFileName(fileName.replace(/\.png$/i, ''));
  link.href = dataUrl;
  link.click();
}
