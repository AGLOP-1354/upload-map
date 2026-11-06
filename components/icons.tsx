// 선 아이콘 모음. 장식용이라 모두 aria-hidden.
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const LockIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} className={className} {...base}>
    <rect x="5" y="11" width="14" height="10" rx="1.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const EyeIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} className={className} {...base}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const AlertIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2} className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16.5v.5" />
  </svg>
);

export const CheckIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={3} className={className} {...base}>
    <path d="M5 12l5 5 9-10" />
  </svg>
);

export const ChevronDownIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2} className={className} {...base}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const ChevronLeftIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2} className={className} {...base}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const PlusIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2} className={className} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const PencilIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2} className={className} {...base}>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
  </svg>
);

export const XIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2.4} className={className} {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const UploadIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2} className={className} {...base}>
    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
  </svg>
);

export const MonitorIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={2} className={className} {...base}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

export const PortraitIcon = ({ className }: P) => (
  <svg viewBox="0 0 10 14" strokeWidth={1.6} className={className} {...base}>
    <rect x="1" y="1" width="8" height="12" rx="1.5" />
  </svg>
);

export const LandscapeIcon = ({ className }: P) => (
  <svg viewBox="0 0 16 10" strokeWidth={1.6} className={className} {...base}>
    <rect x="1" y="1" width="14" height="8" rx="1.5" />
  </svg>
);
