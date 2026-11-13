/**
 * Hostel photos in live mode. The editor works with images as data URLs (like the demo);
 * before saving, new ones are uploaded to the "hostel-photos" storage bucket and replaced by their web address.
 * That keeps the hostels table small, so Explore stays fast.
 */
import { ApiError } from './errors';
import { friendly } from './remote';
import { sb } from './supabase';

const BUCKET = 'hostel-photos';
const dataUrlToBlob = async (d: string) => (await fetch(d)).blob();
const fileName = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
/** The storage path of a photo uploaded here, or null for other addresses. */
const pathOf = (url: string) => { const m = url.match(/\/storage\/v1\/object\/public\/hostel-photos\/(.+)$/); return m ? decodeURIComponent(m[1]!) : null; };

/** Uploads every photo that is still a data URL. Returns the list with web addresses, in the same order. */
export async function uploadHostelPhotos(hostelId: string, photos: string[]): Promise<string[]> {
  return Promise.all(photos.map(async p => {
    if (!p.startsWith('data:')) return p;
    const path = `${hostelId}/${fileName()}`;
    const blob = await dataUrlToBlob(p);
    const { error } = await sb!.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', cacheControl: '31536000' });
    if (error) throw new ApiError(/security|Unauthorized/i.test(error.message) ? 'You do not have permission to add photos to this hostel.' : friendly(error));
    return sb!.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }));
}

/** Deletes uploaded photos that are no longer used. Failures are ignored: an unused file does no harm. */
export async function removeHostelPhotos(before: string[], after: string[]) {
  const gone = before.filter(p => !after.includes(p)).map(pathOf).filter((x): x is string => !!x);
  if (gone.length) await sb!.storage.from(BUCKET).remove(gone).catch(() => undefined);
}
