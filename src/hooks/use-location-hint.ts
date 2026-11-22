import { useMemo } from 'react';

import {
  evaluateClientRadiusHint,
  type ClientRadiusHint,
} from '@/services/attendance/radius-hint';
import type { PresensiSessionMeta } from '@/services/attendance/session-view';
import type { DeviceLocationFix, LabConfiguration } from '@/types/sprint3';

export function useLocationHint(
  fix: DeviceLocationFix | null,
  meta: PresensiSessionMeta | null,
  lab: LabConfiguration | null,
): ClientRadiusHint | null {
  return useMemo(() => {
    if (!meta) return null;
    return evaluateClientRadiusHint(
      fix,
      meta.attendanceConfig,
      lab,
      meta.labName,
      meta.radiusMeters,
    );
  }, [fix, meta, lab]);
}
