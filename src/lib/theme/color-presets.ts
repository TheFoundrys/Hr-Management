/** Accent families for the dashboard UI (light + dark tokens live in globals.css). */
export const COLOR_PRESET_IDS = ['navy', 'ocean', 'emerald', 'violet', 'amber'] as const;
export type ColorPresetId = (typeof COLOR_PRESET_IDS)[number];

export const COLOR_PRESETS: { id: ColorPresetId; label: string; hint: string }[] = [
  { id: 'navy', label: 'Institutional', hint: 'Classic blue — default' },
  { id: 'ocean', label: 'Ocean', hint: 'Teal & cyan' },
  { id: 'emerald', label: 'Forest', hint: 'Green professional' },
  { id: 'violet', label: 'Violet', hint: 'Creative purple' },
  { id: 'amber', label: 'Amber', hint: 'Warm gold' },
];

export function isColorPresetId(value: string): value is ColorPresetId {
  return (COLOR_PRESET_IDS as readonly string[]).includes(value);
}
