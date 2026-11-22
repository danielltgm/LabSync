import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest side of stored room photos. ~1024 px JPEG at 0.6 ≈ 100–200 kB, well under Firestore's 1 MB doc limit. */
const MAX_SIDE = 1024;

/**
 * Picks a room photo and returns it as a compact JPEG data URI. The server stores each photo as its
 * own Firestore document (labPhotos/{id}), so it must be small and self-contained.
 */
export async function pickRoomPhoto(source: 'library' | 'camera'): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('CAMERA_DENIED');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 1 };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset) return null;

  const landscape = (asset.width ?? 0) >= (asset.height ?? 0);
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width ?? 0, asset.height ?? 0) > MAX_SIDE) context.resize(landscape ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  if (!saved.base64) throw new Error('PHOTO_FAILED');
  return `data:image/jpeg;base64,${saved.base64}`;
}
