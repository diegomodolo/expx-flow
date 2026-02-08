import { ORIENTATIONS, Orientation } from '../OrientationSelector';

/**
 * Detecta a orientação mais próxima baseada nas dimensões da imagem
 */
export function detectOrientationFromDimensions(width: number, height: number): Orientation {
  const imageRatio = width / height;
  
  let bestMatch = ORIENTATIONS.find(o => o.id === 'post')!; // Default: 1:1
  let smallestDiff = Infinity;
  
  for (const orientation of ORIENTATIONS) {
    const orientationRatio = orientation.width / orientation.height;
    const diff = Math.abs(imageRatio - orientationRatio);
    
    if (diff < smallestDiff) {
      smallestDiff = diff;
      bestMatch = orientation;
    }
  }
  
  return bestMatch;
}

/**
 * Carrega uma imagem e detecta sua orientação
 */
export function detectOrientationFromUrl(imageUrl: string): Promise<Orientation> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const orientation = detectOrientationFromDimensions(img.naturalWidth, img.naturalHeight);
      resolve(orientation);
    };
    
    img.onerror = () => {
      // Fallback para Post (1:1) em caso de erro
      resolve(ORIENTATIONS.find(o => o.id === 'post')!);
    };
    
    img.src = imageUrl;
  });
}
