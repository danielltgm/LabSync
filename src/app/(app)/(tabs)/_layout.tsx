import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';

import { TabBar, TabButton } from '@/components/app/tab-bar';

// Headless tabs so the bar can float and give attendance the center slot.
// All triggers are always rendered (that's what registers a route); TabButton shows only
// Beranda, the user's three slots and Profil (see useNavSlots in data/nav.ts).
export default function TabsLayout() {
  return (
    <Tabs className="flex-1">
      {/* TabSlot defaults to flexShrink 0 / basis auto, so it grows with its content and the
          screen's ScrollView never gets a bounded height (nothing scrolls). Pin it to the viewport. */}
      <TabSlot style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 }} />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton tab="index" />
          </TabTrigger>
          <TabTrigger name="jadwal" href="/jadwal" asChild>
            <TabButton tab="jadwal" />
          </TabTrigger>
          <TabTrigger name="kelas" href="/kelas" asChild>
            <TabButton tab="kelas" />
          </TabTrigger>
          <TabTrigger name="admin" href="/admin" asChild>
            <TabButton tab="admin" />
          </TabTrigger>
          <TabTrigger name="presensi" href="/presensi" asChild>
            <TabButton tab="presensi" />
          </TabTrigger>
          <TabTrigger name="izin" href="/izin" asChild>
            <TabButton tab="izin" />
          </TabTrigger>
          <TabTrigger name="peta" href="/peta" asChild>
            <TabButton tab="peta" />
          </TabTrigger>
          <TabTrigger name="log" href="/log" asChild>
            <TabButton tab="log" />
          </TabTrigger>
          <TabTrigger name="profil" href="/profil" asChild>
            <TabButton tab="profil" />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}
