# KINARA Mobile — Expo Scaffold

> Shares `src/types` + `src/lib/validators` + `src/lib/tokens` via pnpm workspace.

```bash
cd apps/mobile
pnpm install
pnpm start  # Expo Go
```

**Reuse:**
- `import { ClipItem } from "../../src/types"`
- `import { clipCreateSchema } from "../../src/lib/validators"`
- `import { tokens } from "../../src/lib/tokens"`

**Screens (to be built):** `Clips` (vertical `FlatList` + `expo-av Video` loop), `Stories` (horizontal `ScrollView`), `Live` (`WebView` + chat), `Radar` (`react-native-maps` + `expo-location`), `Marketplace`, `Messages`.

See `ROADMAP.md` Horizon 2.1.
