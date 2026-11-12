import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home"
  | "grid"
  | "cube"
  | "sparkles"
  | "layers"
  | "server"
  | "play"
  | "library"
  | "wand"
  | "settings"
  | "pulse"
  | "search"
  | "close"
  | "minimize"
  | "maximize"
  | "restore"
  | "chevronDown"
  | "chevronRight"
  | "arrowLeft"
  | "arrowUpRight"
  | "check"
  | "plus"
  | "trash"
  | "folder"
  | "download"
  | "upload"
  | "refresh"
  | "copy"
  | "external"
  | "shield"
  | "alert"
  | "info"
  | "filter"
  | "pin"
  | "clock"
  | "monitor"
  | "sun"
  | "moon"
  | "volume"
  | "terminal"
  | "package"
  | "cpu"
  | "globe"
  | "users"
  | "link"
  | "zap";

const paths: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  cube: (
    <>
      <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7L12 2.8Z" />
      <path d="M3.8 7.2 12 11.6l8.2-4.4M12 11.8v9" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18.2l-1.8-5.6L4.7 10.8 10.2 9 12 3.5Z" />
      <path d="M18.5 15.5 19.3 18l2.5.8-2.5.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8.8-2.5Z" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m4.2 12.2 7.8 4.1 7.8-4.1M4.2 16.7l7.8 4.1 7.8-4.1" />
    </>
  ),
  server: (
    <>
      <rect x="3.5" y="4" width="17" height="6.2" rx="1.6" />
      <rect x="3.5" y="13.8" width="17" height="6.2" rx="1.6" />
      <path d="M7 7.1h.01M7 16.9h.01" />
    </>
  ),
  play: <path d="M8 5.2v13.6L19 12 8 5.2Z" />,
  library: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M12 4h3.2l2.3 15.6-3.1.4L12 4Z" />
    </>
  ),
  wand: (
    <>
      <path d="m4 20 11.2-11.2M14.4 4.2l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1 1-2.4Z" />
      <path d="m19 13 .6 1.4 1.4.6-1.4.6L19 17l-.6-1.4L17 15l1.4-.6L19 13Z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.4a7.6 7.6 0 0 0 0-4.8l1.6-1.2-1.8-3.2-2 .8a7.6 7.6 0 0 0-4.1-2.4L12.8 1.5h-3.6L8.9 3.6A7.6 7.6 0 0 0 4.8 6l-2-.8-1.8 3.2 1.6 1.2a7.6 7.6 0 0 0 0 4.8l-1.6 1.2 1.8 3.2 2-.8a7.6 7.6 0 0 0 4.1 2.4l.3 2.1h3.6l.3-2.1a7.6 7.6 0 0 0 4.1-2.4l2 .8 1.8-3.2-1.6-1.2Z" />
    </>
  ),
  pulse: <path d="M3 12h4l2.2-5.5L13.8 17 16 12h5" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  close: <path d="m5.5 5.5 13 13m0-13-13 13" />,
  minimize: <path d="M5 12h14" />,
  maximize: <rect x="5" y="5" width="14" height="14" rx="1.5" />,
  restore: (
    <>
      <rect x="4.5" y="7.5" width="12" height="12" rx="1.4" />
      <path d="M8 7.5V5.2A.7.7 0 0 1 8.7 4.5H19a.7.7 0 0 1 .7.7v10.3a.7.7 0 0 1-.7.7h-2.5" />
    </>
  ),
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  arrowLeft: <path d="M19 12H5m0 0 6-6m-6 6 6 6" />,
  arrowUpRight: <path d="M7 17 17 7m0 0H8.5M17 7v8.5" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4.5 7h15M9 7V4.8h6V7M6.5 7l.9 13.2h9.2L17.5 7" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  folder: <path d="M3.5 6.8A1.8 1.8 0 0 1 5.3 5h4l2 2.4h7.4a1.8 1.8 0 0 1 1.8 1.8v8.5a1.8 1.8 0 0 1-1.8 1.8H5.3a1.8 1.8 0 0 1-1.8-1.8V6.8Z" />,
  download: <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M4.5 19.5h15" />,
  upload: <path d="M12 20V9m0 0 4.5 4.5M12 9l-4.5 4.5M4.5 4.5h15" />,
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5V9H15" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  shield: <path d="M12 3.2 19 6v5.4c0 4.3-2.8 7.6-7 9.4-4.2-1.8-7-5.1-7-9.4V6l7-2.8Z" />,
  alert: (
    <>
      <path d="M12 3.8 21 20H3L12 3.8Z" />
      <path d="M12 9v4.5M12 16.8h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.4v5.3L10.2 20v-7.1L4 5.5Z" />,
  pin: <path d="m9 3 6 6-1.4 1.4 1.2 4.2-1.4 1.4-3.2-3.2L5 18l-1-1 5.2-5.2L6 8.6l1.4-1.4 4.2 1.2L13 7l-4-4Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="1.8" />
      <path d="M9 20h6m-3-3.5V20" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  volume: (
    <>
      <path d="M4.5 9.5h3l4-3.2v11.4l-4-3.2h-3v-5Z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7 9 3 3-3 3M12.5 15H17" />
    </>
  ),
  package: (
    <>
      <path d="M12 3 20.5 7.5v9L12 21l-8.5-4.5v-9L12 3Z" />
      <path d="M3.8 7.7 12 12l8.2-4.3M12 12v8.8" />
    </>
  ),
  cpu: (
    <>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" />
      <path d="M10 3v3.5M14 3v3.5M10 17.5V21M14 17.5V21M3 10h3.5M3 14h3.5M17.5 10H21M17.5 14H21" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M3.5 12h17M12 3.2c2.4 2.4 3.6 5.4 3.6 8.8s-1.2 6.4-3.6 8.8c-2.4-2.4-3.6-5.4-3.6-8.8S9.6 5.6 12 3.2Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2M16 5.8a3 3 0 0 1 0 5.6M17.5 14.4c1.8.6 3 2.2 3 4.2" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.3-1.3" />,
  zap: <path d="M13.5 2.5 4.5 14h6l-1 7.5L19.5 10h-6l1-7.5Z" />,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.6,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
