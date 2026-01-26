import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

export interface ExportOptions {
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export async function exportCanvasToBlob(
  canvasElement: HTMLElement,
  options: ExportOptions = {}
): Promise<Blob> {
  const { scale = 2, format = 'png', quality = 1.0 } = options;

  const canvas = await html2canvas(canvasElement, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

export async function uploadToStorage(
  blob: Blob,
  bucket: string = 'visual-creatives',
  folder: string = 'edited-creatives'
): Promise<string> {
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function exportAndUpload(
  canvasElement: HTMLElement,
  options?: ExportOptions
): Promise<string> {
  const blob = await exportCanvasToBlob(canvasElement, options);
  return await uploadToStorage(blob);
}

export function downloadBlob(blob: Blob, fileName: string = 'creative.png'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadCanvas(
  canvasElement: HTMLElement,
  fileName: string = 'creative.png',
  options?: ExportOptions
): Promise<void> {
  const blob = await exportCanvasToBlob(canvasElement, options);
  downloadBlob(blob, fileName);
}
