'use client';

import { useEffect } from 'react';
import { useAppearanceStore } from '@/lib/stores/appearanceStore';
import { isColorPresetId } from '@/lib/theme/color-presets';

/** Keeps `data-color` on `<html>` in sync with persisted appearance (all layouts). */
export function AppearanceHydrator() {
  const colorPreset = useAppearanceStore((s) => s.colorPreset);
  const setColorPreset = useAppearanceStore((s) => s.setColorPreset);

  useEffect(() => {
    if (!isColorPresetId(colorPreset)) {
      setColorPreset('navy');
      return;
    }
    document.documentElement.dataset.color = colorPreset;
  }, [colorPreset, setColorPreset]);

  return null;
}
