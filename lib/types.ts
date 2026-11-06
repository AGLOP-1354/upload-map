// 데이터 타입의 단일 정의. 스키마 원문은 .claude/rules/data-layer.md

export const VIDEO_STATUSES = [
  "idea",
  "research",
  "scripting",
  "packaging",
  "filming",
  "editing",
  "scheduled",
  "published",
  "reviewed",
  "dropped",
] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export interface VideoMetrics {
  capturedAt: string;
  daysSincePublish: number;
  views?: number;
  impressions?: number;
  ctr?: number;
  avdSeconds?: number;
  avgPercentViewed?: number;
  retention30s?: number;
  subsGained?: number;
  returningViewersPct?: number;
}

export interface Video {
  id: string;
  workingTitle: string;
  format: "long" | "short";
  pillarId: string;
  status: VideoStatus;
  promise?: string;
  parentId?: string;
  hook?: { formula: string; text: string; score?: number };
  package?: {
    titles: string[];
    selectedTitle?: string;
    thumbnailText?: string;
    thumbnailConcept?: string;
  };
  targetPublishDate?: string;
  publishedAt?: string;
  youtubeId?: string;
  metrics: VideoMetrics[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SlotRole = "anchor" | "cheap" | "short";

export interface WeekPlan {
  weekOf: string;
  hoursAvailable?: number;
  slots: { videoId: string; role: SlotRole; due?: string; done: boolean }[];
  retro?: string;
}

export interface Channel {
  name: string;
  niche: string;
  audience: string;
  stage: "<1k" | "1k-50k" | "50k+";
  pillars: { id: string; name: string; description: string }[];
  voice: { tone: string; do: string[]; dont: string[] };
  cadence: { longPerWeek: number; shortsPerWeek: number };
}

export interface VideosFile {
  version: 1;
  videos: Video[];
}

export interface PlansFile {
  version: 1;
  weeks: WeekPlan[];
}

export const CONTENT_KINDS = ["brief", "script", "package", "review"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
