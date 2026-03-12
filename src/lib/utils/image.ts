import type { Area } from 'react-easy-crop';

/**
 * Create an image element from a URL
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // Only set crossOrigin for remote URLs (not data URLs or blob URLs)
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });
}

/**
 * Convert a Blob or File to a data URL
 */
export function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', reject);
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch an image URL and convert it to a data URL so it can be safely re-cropped.
 */
export async function readImageUrlAsDataURL(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  return readFileAsDataURL(blob);
}

/**
 * Get the cropped image as a Blob
 * outputSize is the width; height is calculated from the crop aspect ratio
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  options: {
    outputSize?: number;
    mimeType?: string;
    quality?: number;
  } = {}
): Promise<Blob> {
  const {
    outputSize = 256,
    mimeType = 'image/jpeg',
    quality = 0.9,
  } = options;

  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Calculate output height based on crop aspect ratio
  const aspectRatio = pixelCrop.width / pixelCrop.height;
  const outputWidth = outputSize;
  const outputHeight = Math.round(outputSize / aspectRatio);

  // Set canvas size to desired output size
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  // Fill with white background (JPEG doesn't support transparency - transparent pixels become black)
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
  }

  // Draw the cropped image scaled to output size
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  // Return as blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas is empty'));
        }
      },
      mimeType,
      quality
    );
  });
}
