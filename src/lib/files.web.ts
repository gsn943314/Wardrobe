/**
 * Web build of files.ts. There is no app document directory in the browser, so picked photos
 * are shrunk into data URLs (they must fit in localStorage) and videos stay as in-memory
 * blob URLs that last for the current page session.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('圖片讀取失敗'));
    img.src = src;
  });
}

async function shrinkToDataUrl(uri: string, maxSide = 900): Promise<string> {
  const img = await loadImage(uri);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export async function saveItemImages(_itemId: string, uris: string[]): Promise<string[]> {
  return Promise.all(
    uris.map(async (uri) => {
      // Remote URLs and our own small SVG samples are stored as-is.
      if (/^https?:/i.test(uri) || uri.startsWith('data:image/svg')) return uri;
      if (uri.startsWith('data:') && uri.length < 300_000) return uri;
      try {
        return await shrinkToDataUrl(uri);
      } catch {
        return uri;
      }
    }),
  );
}

export function deleteItemFiles(_itemId: string) {}

export function importVideo(uri: string, _name: string): string {
  return uri;
}

export function deleteFile(uri?: string) {
  if (uri?.startsWith('blob:')) URL.revokeObjectURL(uri);
}

const unsupported = () => {
  throw new Error('網頁版不支援實際 AI 試穿，請用 Android 版');
};
export const itemDir = unsupported;
export const videoDir = unsupported;
export const tryOnDir = unsupported;
export const workDir = unsupported;
export const localImageFile = unsupported;
