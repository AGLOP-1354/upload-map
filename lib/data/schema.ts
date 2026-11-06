import "server-only";
import { z } from "zod";
import {
  CONTENT_KINDS,
  VIDEO_STATUSES,
  type Channel,
  type PlansFile,
  type Video,
  type VideoMetrics,
  type VideosFile,
  type WeekPlan,
} from "@/lib/types";

// 저장 전 런타임 검증. 타입은 lib/types.ts 가 단일 출처이고, 아래 Equal 검사로 어긋나면 tsc 가 실패한다.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다");
const isoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "ISO 8601 날짜·시간이어야 합니다");
const pct = z.number().min(0).max(100);

export const videoIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id는 kebab-case 영문 소문자·숫자여야 합니다");
export const videoStatusSchema = z.enum(VIDEO_STATUSES);
export const contentKindSchema = z.enum(CONTENT_KINDS);

export const metricsSchema = z.object({
  capturedAt: isoDateTime,
  daysSincePublish: z.number().int().min(0),
  views: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  ctr: pct.optional(),
  avdSeconds: z.number().min(0).optional(),
  avgPercentViewed: pct.optional(),
  retention30s: pct.optional(),
  subsGained: z.number().int().optional(),
  returningViewersPct: pct.optional(),
});

export const hookSchema = z.object({
  formula: z.string().min(1),
  text: z.string().min(1),
  score: z.number().optional(),
});

export const packageSchema = z.object({
  titles: z.array(z.string().min(1)),
  selectedTitle: z.string().optional(),
  thumbnailText: z.string().optional(),
  thumbnailConcept: z.string().optional(),
});

export const videoSchema = z.object({
  id: videoIdSchema,
  workingTitle: z.string().min(1),
  format: z.enum(["long", "short"]),
  pillarId: z.string().min(1),
  status: videoStatusSchema,
  promise: z.string().optional(),
  parentId: z.string().optional(),
  hook: hookSchema.optional(),
  package: packageSchema.optional(),
  targetPublishDate: isoDate.optional(),
  publishedAt: isoDateTime.optional(),
  youtubeId: z.string().optional(),
  metrics: z.array(metricsSchema),
  notes: z.string().optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const slotRoleSchema = z.enum(["anchor", "cheap", "short"]);

export const weekPlanSchema = z.object({
  weekOf: isoDate,
  hoursAvailable: z.number().min(0).optional(),
  slots: z.array(
    z.object({
      videoId: z.string().min(1),
      role: slotRoleSchema,
      due: isoDate.optional(),
      done: z.boolean(),
    }),
  ),
  retro: z.string().optional(),
});

export const channelSchema = z.object({
  name: z.string(),
  niche: z.string(),
  audience: z.string(),
  stage: z.enum(["<1k", "1k-50k", "50k+"]),
  pillars: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
  voice: z.object({ tone: z.string(), do: z.array(z.string()), dont: z.array(z.string()) }),
  cadence: z.object({ longPerWeek: z.number(), shortsPerWeek: z.number() }),
});

export const videosFileSchema = z.object({ version: z.literal(1), videos: z.array(videoSchema) });
export const plansFileSchema = z.object({ version: z.literal(1), weeks: z.array(weekPlanSchema) });

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const typeChecks: [
  Equal<z.infer<typeof metricsSchema>, VideoMetrics>,
  Equal<z.infer<typeof videoSchema>, Video>,
  Equal<z.infer<typeof weekPlanSchema>, WeekPlan>,
  Equal<z.infer<typeof channelSchema>, Channel>,
  Equal<z.infer<typeof videosFileSchema>, VideosFile>,
  Equal<z.infer<typeof plansFileSchema>, PlansFile>,
] = [true, true, true, true, true, true];
void typeChecks;
