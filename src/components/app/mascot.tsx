import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

/**
 * "Labi", the LabSync mascot: a retro CRT computer from the campus lab with a map-pin antenna
 * (attendance is location-based). Its screen color follows the mood.
 * Art is cut from assets/source/mascot-sheet.webp (see docs/art-prompts.md).
 */
const ART = {
  hello: require('../../../assets/mascot/labi-hello.png'),
  front: require('../../../assets/mascot/labi-front.png'),
  happy: require('../../../assets/mascot/labi-happy.png'),
  success: require('../../../assets/mascot/labi-success.png'),
  waiting: require('../../../assets/mascot/labi-waiting.png'),
  oops: require('../../../assets/mascot/labi-oops.png'),
  empty: require('../../../assets/mascot/labi-empty.png'),
  determined: require('../../../assets/mascot/labi-determined.png'),
  scan: require('../../../assets/mascot/labi-scan.png'),
  coding: require('../../../assets/mascot/labi-coding.png'),
  clipboard: require('../../../assets/mascot/labi-clipboard.png'),
  reading: require('../../../assets/mascot/labi-reading.png'),
} as const;

/**
 * hello: waving, full body · front: standing · happy: smiling head
 * success: celebrating (aqua screen) · waiting: sleep mode · oops: error (coral screen)
 * empty: confused (mustard screen) · determined: ready to work · scan: running to class
 * coding: on a laptop · clipboard: taking attendance · reading: studying
 */
export type MascotMood = keyof typeof ART;

export function Mascot({ mood = 'hello', size = 120, float = true }: { mood?: MascotMood; size?: number; float?: boolean }) {
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!float) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, float]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] });

  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={`Labi, maskot LabSync (${mood})`}>
      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <Image source={ART[mood]} style={{ width: size, height: size }} contentFit="contain" />
      </Animated.View>
    </View>
  );
}
