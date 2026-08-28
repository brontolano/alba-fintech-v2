import { useEffect, useState } from 'react';

interface UnitInfo {
  id: string;
  name: string;
  isRetail: boolean;
  isActive: boolean;
}

export function useUnitInfo(unitId: string | null | undefined): { unit: UnitInfo | null; loading: boolean } {
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [loading, setLoading] = useState(!!unitId);

  useEffect(() => {
    if (!unitId) {
      setLoading(false);
      return;
    }
    let aborted = false;
    setLoading(true);
    fetch(`/api/units/${unitId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!aborted) {
          // API mengembalikan { data: {...}, _count: {...} } — gunakan data.data
          setUnit(data?.data ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!aborted) {
          setUnit(null);
          setLoading(false);
        }
      });
    return () => {
      aborted = true;
    };
  }, [unitId]);

  return { unit, loading };
}
