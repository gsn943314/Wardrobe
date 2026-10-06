import { Directory, File, Paths } from 'expo-file-system';

/** App-owned folders under the document directory (kept across launches, not cleared by the OS). */
function dir(...parts: string[]): Directory {
  const d = new Directory(Paths.document, ...parts);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

export const itemDir = (itemId: string) => dir('items', itemId);
export const videoDir = () => dir('videos');
export const tryOnDir = () => dir('tryon');
export const workDir = () => {
  const d = new Directory(Paths.cache, 'tryon-work');
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
};

function extensionOf(uri: string, fallback: string): string {
  const m = uri.split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : fallback;
}

/**
 * Keep a local copy of each product image so the fitting room still works if the store
 * removes the product. Failures fall back to the remote URL.
 */
export async function saveItemImages(itemId: string, uris: string[]): Promise<string[]> {
  const target = itemDir(itemId);
  return Promise.all(
    uris.map(async (uri, i) => {
      if (uri.startsWith(target.uri)) return uri;
      const dest = new File(target, `img-${Date.now()}-${i}.${extensionOf(uri, 'jpg')}`);
      try {
        if (/^https?:/i.test(uri)) {
          const out = await File.downloadFileAsync(uri, dest, { idempotent: true });
          return out.uri;
        }
        new File(uri).copy(dest);
        return dest.uri;
      } catch {
        return uri;
      }
    }),
  );
}

export function deleteItemFiles(itemId: string) {
  const d = new Directory(Paths.document, 'items', itemId);
  if (d.exists) d.delete();
}

/** Copy a picked/recorded video into app storage so it survives gallery cleanup. */
export function importVideo(uri: string, name: string): string {
  const dest = new File(videoDir(), `${name}-${Date.now()}.${extensionOf(uri, 'mp4')}`);
  new File(uri).copy(dest);
  return dest.uri;
}

export function deleteFile(uri?: string) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}

/** A local file for an image: local URIs are used as-is, remote ones are downloaded to cache. */
export async function localImageFile(uri: string): Promise<File> {
  if (!/^https?:/i.test(uri)) return new File(uri);
  const dest = new File(workDir(), `ref-${Date.now()}.${extensionOf(uri, 'jpg')}`);
  return File.downloadFileAsync(uri, dest, { idempotent: true });
}
