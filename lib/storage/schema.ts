/**
 * Zod schemas for persisted state. Stored data is untrusted input (another build, a browser
 * extension or a user may have edited it), so it is validated at this boundary only.
 */
import { z } from "zod";
import { LIMITS, PAD_COLORS } from "@/types";

export const PadSchema = z.object({
  id: z.string().min(1),
  soundId: z.string().min(1).nullable(),
  label: z.string().max(LIMITS.padLabelMax),
  color: z.enum(PAD_COLORS),
});

export const ColumnsSchema = z.object({
  base: z.number().int().min(1).max(6),
  md: z.number().int().min(1).max(8).optional(),
  lg: z.number().int().min(1).max(8).optional(),
});

export const ProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(LIMITS.profileNameMax),
  basePresetId: z.string().min(1),
  columns: ColumnsSchema,
  pads: z.array(PadSchema).min(LIMITS.minPads).max(LIMITS.maxPads),
  updatedAt: z.string(),
});

export const SettingsSchema = z.object({
  masterVolume: z.number().min(0).max(1),
  focusMode: z.boolean(),
  focusLevelLine: z.boolean(),
});

export const StoredStateSchema = z.object({
  version: z.literal(1),
  activeProfileId: z.string().min(1),
  profiles: z.array(ProfileSchema).min(1).max(LIMITS.maxProfiles),
  settings: SettingsSchema,
});
