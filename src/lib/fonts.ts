import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed/800ExtraBold';
import { SpaceGrotesk_400Regular } from '@expo-google-fonts/space-grotesk/400Regular';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono/400Regular';
import { SpaceMono_700Bold } from '@expo-google-fonts/space-mono/700Bold';
import { useFonts } from 'expo-font';

/*
 * Three families, matching --font-sans / --font-display / --font-mono in global.css.
 * Display: Barlow Condensed, set in caps for titles and big numbers.
 * Sans: Space Grotesk for body copy. Mono: Space Mono for chips, times and codes.
 */
const FAMILIES = [
  {
    fontFamily: 'Grotesk',
    fontDefinitions: [
      { path: SpaceGrotesk_400Regular, weight: 400 as const },
      { path: SpaceGrotesk_500Medium, weight: 500 as const },
      { path: SpaceGrotesk_600SemiBold, weight: 600 as const },
      { path: SpaceGrotesk_700Bold, weight: 700 as const },
    ],
  },
  {
    fontFamily: 'Display',
    fontDefinitions: [
      { path: BarlowCondensed_700Bold, weight: 700 as const },
      { path: BarlowCondensed_800ExtraBold, weight: 800 as const },
    ],
  },
  {
    fontFamily: 'Mono',
    fontDefinitions: [
      { path: SpaceMono_400Regular, weight: 400 as const },
      { path: SpaceMono_700Bold, weight: 700 as const },
    ],
  },
];

/** True once fonts are ready, or failed (we fall back to system fonts rather than block). */
export function useAppFonts() {
  const [loaded, error] = useFonts(FAMILIES);
  return loaded || !!error;
}
