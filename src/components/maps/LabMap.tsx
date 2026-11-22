
import { Notice } from '@/components/common/ui';
import type { Coordinates, LabId } from '@/types/sprint3';

export interface LabMapProps {
  markers: { id: LabId; name: string; coordinates: Coordinates }[];
  location?: Coordinates;
  selected: LabId | null;
  onSelect: (id: LabId) => void;
}

export function LabMap(_props: LabMapProps) {
  return <Notice message="Peta interaktif tersedia di aplikasi mobile." />;
}
