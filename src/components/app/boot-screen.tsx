import { Image } from 'expo-image';
import { ActivityIndicator, View } from 'react-native';

// Shown while fonts and the demo store load, right after the native splash. Same art, size and
// background as the splash (app.json, expo-splash-screen) so the handoff doesn't jump.
// Rendered on the server and on first client paint, so it avoids icons whose
// colors only resolve on the client (prevents hydration mismatches on web).
export function BootScreen() {
  return (
    <View className="bg-background flex-1 items-center justify-center">
      <Image source={require('../../../assets/images/splash-icon.png')} style={{ width: 200, height: 223 }} contentFit="contain" />
      <ActivityIndicator className="absolute bottom-24" />
    </View>
  );
}
