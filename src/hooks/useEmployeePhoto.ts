import { useEffect, useState } from 'react';
import { employeeService } from '@/services/employeeService';

/** One photo request per employee for the whole session (table, drawer and profile share it). */
const photoCache = new Map<number, Promise<string | null>>();

function loadPhoto(empNo: number): Promise<string | null> {
  let pending = photoCache.get(empNo);
  if (!pending) {
    pending = employeeService.getEmployeePhoto(empNo).catch(() => null);
    photoCache.set(empNo, pending);
  }
  return pending;
}

/** Photo src from GET /api/payroll/employees/photo/{empNo}, or null (show initials). */
export function useEmployeePhoto(empNo: number): string | null {
  const [loaded, setLoaded] = useState<{ empNo: number; src: string | null } | null>(null);

  useEffect(() => {
    if (!empNo) return;
    let cancelled = false;
    void loadPhoto(empNo).then((src) => {
      if (!cancelled) setLoaded({ empNo, src });
    });
    return () => {
      cancelled = true;
    };
  }, [empNo]);

  return loaded?.empNo === empNo ? loaded.src : null;
}
