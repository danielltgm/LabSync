# LabSync art

Labi is the LabSync mascot: a retro CRT computer from the campus lab with a coral map-pin antenna (attendance is location-based). Its screen color follows its mood.

## Source files

- `assets/source/app-icon.webp`: the app icon artwork (1254×1254).
- `assets/source/mascot-sheet.webp`: the character sheet (turnaround, expressions, actions).

Everything in `assets/images/` (icons, splash) and `assets/mascot/` (poses) is generated from these two files.

## Mascot poses (`assets/mascot/`)

| File | Mood in `<Mascot mood=… />` | Used for |
| --- | --- | --- |
| `labi-hello.png` | `hello` | Login, splash screen |
| `labi-front.png` | `front` | Profile header |
| `labi-happy.png` | `happy` | Hero card after the student checked in |
| `labi-success.png` | `success` | Check-in success |
| `labi-waiting.png` | `waiting` | Session not open yet |
| `labi-oops.png` | `oops` | Check-in rejected |
| `labi-empty.png` | `empty` | Empty lists (default for `EmptyState`) |
| `labi-determined.png` | `determined` | Coordinator console |
| `labi-scan.png` | `scan` | Live session, student hasn't checked in |
| `labi-coding.png` | `coding` | Spare |
| `labi-clipboard.png` | `clipboard` | Live session, assistant view |
| `labi-reading.png` | `reading` | Spare |

The poses are cut from the sheet with the background removed (flood fill from the crop edge through the cream paper and sage shadows), then quantized to 256 colors. To recut after replacing the sheet, adjust `BOXES` in `scripts/cut-mascot.py` and run `python scripts/cut-mascot.py` (needs Pillow and NumPy).

## App icons (`assets/images/`)

| File | What |
| --- | --- |
| `icon.png` | 1024 icon, iOS and default |
| `android-icon-foreground.png` | Icon art without the flat coral corners, shrunk into Android's safe zone |
| `android-icon-background.png` | Flat coral `#F46143` |
| `android-icon-monochrome.png` | The black line art as a white silhouette, for Android 13+ themed icons |
| `favicon.png` | 196 px web favicon |
| `splash-icon.png` | Labi waving; splash background is sage `#D3E1D8` (dark: `#141414`) |

## Prompts (for more poses in the same style)

Attach the character sheet as the reference image, then add the style block.

```
Style: flat vector, retro 1930s rubber-hose cartoon mixed with modern Swiss poster design, thick uniform
black outlines, flat fills, tiny halftone shading only, no gradients, no 3D, no text.
Palette only: coral #F2684D, violet #6B66F0, mustard #F5C443, aqua #A6E4EF, sage #9CC4AE,
cream #F8F5EE, ink #1B1B1B. Isolated on a plain cream #F8F5EE background, whole body visible.
```

Pose ideas:

- **Location permission:** Labi holding a giant coral map pin like a flag, determined face, violet screen.
- **Notification opt-in:** Labi shouting happily into a mustard megaphone, small bells flying out.
- **Leave request (izin):** Labi wrapped in a sage blanket holding a thermometer, droopy eyes, coral screen, an envelope beside it.
- **Excel export:** Labi carrying a big sage spreadsheet with grid lines and a check mark, aqua screen.
- **Map:** Labi reading a huge unfolded paper campus map with pins sticking out, curious face.
- **Offline:** Labi unplugged, holding its own power cable, dark screen with a small "x" face.
