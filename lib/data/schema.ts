import "server-only";
import { z } from "zod";
import {
  CONTENT_KINDS,
  VIDEO_STATUSES,
  type Channel,
  type ChannelsFile,
  type Credit,
  type CreditsFile,
  type PlansFile,
  type Series,
  type SeriesFile,
  type Task,
  type TasksFile,
  type Video,
  type VideoMetrics,
  type VideosFile,
  type WeekPlan,
} from "@/lib/types";

// 저장 전 런타임 검증. 타입은 lib/types.ts 가 단일 출처이고, 아래 Equal 검사로 어긋나면 tsc 가 실패한다.

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다");
const isoDateTime = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "ISO 8601 날짜·시간이어야 합니다");
const pct = z.number().min(0).max(100);

// 채널 id 규칙은 lib/data/index.ts 의 CHANNEL_ID 와 같다
export const channelIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "채널 id는 영문 소문자·숫자·- 로 64자 이하여야 합니다");
export const videoIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id는 kebab-case 영문 소문자·숫자여야 합니다");
export const videoStatusSchema = z.enum(VIDEO_STATUSES);
export const contentKindSchema = z.enum(CONTENT_KINDS);

export const channelSchema = z.object({
  id: channelIdSchema,
  name: z.string(),
  handle: z.string(),
  color: z.string(),
  logo: z.string().optional(),
  url: z.string().optional(),
  niche: z.string().optional(),
  cadence: z.object({ shortsPerWeek: z.number(), longPerWeek: z.number() }),
  uploadTime: z.string().optional(),
  steps: z.object({ short: z.array(z.string()), long: z.array(z.string()) }),
  gates: z.array(z.string()),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  audience: z.string().optional(),
  stage: z.enum(["<1k", "1k-50k", "50k+"]).optional(),
  pillars: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })).optional(),
  voice: z.object({ tone: z.string(), do: z.array(z.string()), dont: z.array(z.string()) }).optional(),
});

export const seriesSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

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
  format: z.enum(["short", "long"]),
  status: videoStatusSchema,
  seriesId: z.string().optional(),
  episode: z.number().int().min(0).optional(),
  steps: z.record(z.string(), z.enum(["done", "part", "wait", "skip"])),
  checklist: z.array(z.object({ text: z.string(), path: z.string().optional(), done: z.boolean() })).optional(),
  copy: z
    .object({
      overlay: z.string().optional(),
      coldOpen: z.string().optional(),
      recap: z.string().optional(),
      endCard: z.string().optional(),
    })
    .optional(),
  pillarId: z.string().optional(),
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

export const taskSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  detail: z.string().optional(),
  videoId: z.string().optional(),
  done: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const creditSchema = z.object({
  service: z.string(),
  amount: z.number().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
  recordedAt: isoDateTime,
});

const v1 = z.literal(1);
export const channelsFileSchema = z.object({ version: v1, channels: z.array(channelSchema) });
export const seriesFileSchema = z.object({ version: v1, series: z.array(seriesSchema) });
export const videosFileSchema = z.object({ version: v1, videos: z.array(videoSchema) });
export const plansFileSchema = z.object({ version: v1, weeks: z.array(weekPlanSchema) });
export const tasksFileSchema = z.object({ version: v1, tasks: z.array(taskSchema) });
export const creditsFileSchema = z.object({ version: v1, credits: z.array(creditSchema) });

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const typeChecks: [
  Equal<z.infer<typeof channelSchema>, Channel>,
  Equal<z.infer<typeof seriesSchema>, Series>,
  Equal<z.infer<typeof metricsSchema>, VideoMetrics>,
  Equal<z.infer<typeof videoSchema>, Video>,
  Equal<z.infer<typeof weekPlanSchema>, WeekPlan>,
  Equal<z.infer<typeof taskSchema>, Task>,
  Equal<z.infer<typeof creditSchema>, Credit>,
  Equal<z.infer<typeof channelsFileSchema>, ChannelsFile>,
  Equal<z.infer<typeof seriesFileSchema>, SeriesFile>,
  Equal<z.infer<typeof videosFileSchema>, VideosFile>,
  Equal<z.infer<typeof plansFileSchema>, PlansFile>,
  Equal<z.infer<typeof tasksFileSchema>, TasksFile>,
  Equal<z.infer<typeof creditsFileSchema>, CreditsFile>,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true];
void typeChecks;
