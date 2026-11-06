// 데이터 타입의 단일 정의. 스키마 설명은 .claude/rules/data-layer.md 와 일치시킨다.

export type Format = "short" | "long";
// "skip" = 이 영상에는 해당 없는 단계(예: 1화의 지난 이야기). 진행률에서 빠진다.
export type StepState = "done" | "part" | "wait" | "skip";

export interface Channel {
  id: string;
  name: string;
  handle: string;
  color: string;
  logo?: string;
  url?: string;
  niche?: string;
  cadence: { shortsPerWeek: number; longPerWeek: number };
  uploadTime?: string;
  steps: Record<Format, string[]>;
  gates: string[];
  createdAt: string;
  updatedAt: string;
  audience?: string;
  stage?: "<1k" | "1k-50k" | "50k+";
  pillars?: { id: string; name: string; description: string }[];
  voice?: { tone: string; do: string[]; dont: string[] };
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus =
  | "idea" | "research" | "scripting" | "packaging" | "filming"
  | "editing" | "scheduled" | "published" | "reviewed" | "dropped";

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

export interface ChecklistItem {
  text: string;
  path?: string;
  done: boolean;
}

export interface Video {
  id: string;
  workingTitle: string;
  format: Format;
  status: VideoStatus;
  seriesId?: string;
  episode?: number;
  steps: Record<string, StepState>;
  checklist?: ChecklistItem[];
  copy?: { overlay?: string; coldOpen?: string; recap?: string; endCard?: string };
  pillarId?: string;
  promise?: string;
  parentId?: string;
  hook?: { formula: string; text: string; score?: number };
  package?: { titles: string[]; selectedTitle?: string; thumbnailText?: string; thumbnailConcept?: string };
  targetPublishDate?: string;
  publishedAt?: string;
  youtubeId?: string;
  metrics: VideoMetrics[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  text: string;
  detail?: string;
  videoId?: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Credit {
  service: string;
  amount?: number;
  unit?: string;
  note?: string;
  recordedAt: string;
}

// 진행표 칸을 누를 때 도는 순서. "skip" 은 데이터에서만 지정한다.
export const STEP_STATES: StepState[] = ["wait", "part", "done"];

export const DEFAULT_STEPS: Record<Format, string[]> = {
  short: ["소스", "효과음", "쇼츠 파츠", "지난 이야기", "캡컷 조립", "업로드"],
  long: ["소스", "효과음", "조립", "썸네일", "업로드"],
};

export const DEFAULT_GATES = [
  "승인 범위를 넘는 유료 생성(클링·일레븐랩스·미드저니)",
  "대본 컨펌 후 다음 단계",
  "나레이션 테이크 컨펌",
  "고정댓글·커뮤니티 글 게시 전 문구 확인",
];

export const CHANNEL_COLORS = [
  { name: "누런 노랑", hex: "#D9BE5C" },
  { name: "안개 파랑", hex: "#7FA7C9" },
  { name: "이끼 초록", hex: "#8DB37A" },
  { name: "녹슨 주황", hex: "#D98B4E" },
  { name: "빛바랜 분홍", hex: "#C98AA8" },
  { name: "회색", hex: "#A8A293" },
];
