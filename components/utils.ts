// Apply https://web.dev/articles/canvas-hidipi
export function highResCanvasCtx(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D {
  const width = canvas.width;
  const height = canvas.height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  return ctx;
}
