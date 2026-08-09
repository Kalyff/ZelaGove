import { createIcon } from './createIcon';

export type { IconProps } from './createIcon';
export { createIcon } from './createIcon';

/* Conjunto único, substituindo os dois `icons.tsx` que existiam em paralelo nos
   apps com pesos de traço divergentes (1.6 / 2 / 2.5). Todos herdam o mesmo
   traço de `createIcon`. */

/* ---- status ---------------------------------------------------------- */

export const IconClock = createIcon(
  'IconClock',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);

export const IconCheck = createIcon('IconCheck', <path d="m4.5 12.5 5 5 10-11" />);

export const IconTruck = createIcon(
  'IconTruck',
  <>
    <path d="M3 6h11v9H3zM14 9h3.5l2.5 3v3h-6" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>,
);

export const IconAlert = createIcon(
  'IconAlert',
  <>
    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </>,
);

/* ---- navegação ------------------------------------------------------- */

export const IconList = createIcon(
  'IconList',
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
  </>,
);

export const IconBack = createIcon('IconBack', <path d="m15 5-7 7 7 7" />);
export const IconChevronRight = createIcon('IconChevronRight', <path d="m9 5 7 7-7 7" />);
export const IconChevronDown = createIcon('IconChevronDown', <path d="m5 9 7 7 7-7" />);
export const IconClose = createIcon('IconClose', <path d="M6 6l12 12M18 6 6 18" />);
export const IconMenu = createIcon('IconMenu', <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />);
export const IconExit = createIcon(
  'IconExit',
  <>
    <path d="M14 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h8" />
    <path d="M17 8.5 20.5 12 17 15.5M20 12H10" />
  </>,
);

export const IconDashboard = createIcon(
  'IconDashboard',
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </>,
);

export const IconMap = createIcon(
  'IconMap',
  <>
    <path d="m3.5 6.5 5.5-2.5 6 2.5 5.5-2.5v13l-5.5 2.5-6-2.5-5.5 2.5v-13Z" />
    <path d="M9 4v13M15 6.5v13" />
  </>,
);

export const IconKanban = createIcon(
  'IconKanban',
  <>
    <rect x="3.5" y="3.5" width="4.5" height="12" rx="1.2" />
    <rect x="10" y="3.5" width="4.5" height="17" rx="1.2" />
    <rect x="16.5" y="3.5" width="4.5" height="8" rx="1.2" />
  </>,
);

/* ---- ações ----------------------------------------------------------- */

export const IconPlus = createIcon('IconPlus', <path d="M12 5v14M5 12h14" />, 2.25);
export const IconSearch = createIcon(
  'IconSearch',
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>,
);
export const IconCamera = createIcon(
  'IconCamera',
  <>
    <path d="M3.5 8.5h3l1.5-2.5h8l1.5 2.5h3v10h-17v-10Z" />
    <circle cx="12" cy="13" r="3.2" />
  </>,
);
export const IconPin = createIcon(
  'IconPin',
  <>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </>,
);
export const IconInbox = createIcon(
  'IconInbox',
  <>
    <path d="M3.5 13.5 6 5h12l2.5 8.5v5.5h-17v-5.5Z" />
    <path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5" />
  </>,
);
export const IconCopy = createIcon(
  'IconCopy',
  <>
    <rect x="9" y="9" width="11.5" height="11.5" rx="2" />
    <path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 4h8a1.5 1.5 0 0 1 1.5 1.5V6" />
  </>,
);
export const IconGrip = createIcon(
  'IconGrip',
  <>
    <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </>,
);
export const IconEye = createIcon(
  'IconEye',
  <>
    <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const IconEyeOff = createIcon(
  'IconEyeOff',
  <>
    <path d="M10.6 6.1A9.9 9.9 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a17 17 0 0 1-3 3.7M6.5 7.9A16.8 16.8 0 0 0 2 12s3.8 6.5 10 6.5c1.6 0 3-.4 4.3-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" />
  </>,
);
export const IconUser = createIcon(
  'IconUser',
  <>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </>,
);

export const IconExternal = createIcon(
  'IconExternal',
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18.5 14v4.5A1.5 1.5 0 0 1 17 20H5.5A1.5 1.5 0 0 1 4 18.5V7A1.5 1.5 0 0 1 5.5 5.5H10" />
  </>,
);

export const IconStack = createIcon(
  'IconStack',
  <>
    <path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8 12 3.5Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
  </>,
);
export const IconRefresh = createIcon(
  'IconRefresh',
  <>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 4v5h-5" />
  </>,
);

/* ---- tema ------------------------------------------------------------ */

export const IconSun = createIcon(
  'IconSun',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" />
  </>,
);

export const IconMoon = createIcon(
  'IconMoon',
  <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />,
);

export const IconMonitor = createIcon(
  'IconMonitor',
  <>
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8m-4-4v4" />
  </>,
);
