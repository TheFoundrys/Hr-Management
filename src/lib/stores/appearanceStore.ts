'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ColorPresetId } from '@/lib/theme/color-presets';
function applyDatasetColor(preset: ColorPresetId) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.color = preset;
}

type AppearanceState = {
  colorPreset: ColorPresetId;
  setColorPreset: (preset: ColorPresetId) => void;
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      colorPreset: 'navy',
      setColorPreset: (colorPreset) => {
        set({ colorPreset });
        applyDatasetColor(colorPreset);
      },
    }),
    {
      name: 'hr-appearance',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ colorPreset: s.colorPreset }),
    }
  )
);
