import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface CompressedImageOptions {
  maxWidth: number;
  quality?: number;
}

export interface CompressedImageResult {
  uri: string;
  base64?: string;
}

/**
 * Compresses a local image before upload.
 * We only resize by width so Expo preserves aspect ratio automatically.
 */
export async function compressLocalImageResult(
  localUri: string,
  { maxWidth, quality = 0.75 }: CompressedImageOptions
): Promise<CompressedImageResult> {
  const result = await manipulateAsync(
    localUri,
    [{ resize: { width: maxWidth } }],
    {
      base64: true,
      compress: quality,
      format: SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    base64: result.base64,
  };
}

export async function compressLocalImage(
  localUri: string,
  options: CompressedImageOptions
): Promise<string> {
  const result = await compressLocalImageResult(localUri, options);
  return result.uri;
}
