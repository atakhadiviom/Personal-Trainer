import React from 'react';

// Lucide-style 24px stroke icons. Decorative by default (aria-hidden); pass `label` for a meaningful one.
const paths = {
  check: <path d="M20 6 9 17l-5-5" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  swap: <><path d="M17 3l4 4-4 4" /><path d="M3 7h18" /><path d="M7 21l-4-4 4-4" /><path d="M21 17H3" /></>,
  loader: <path d="M12 3a9 9 0 1 0 9 9" />,
  trending: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  utensils: <><path d="M5 3v8a2 2 0 0 0 2 2v8" /><path d="M9 3v8" /><path d="M19 3c-2 2-3 5-3 8h3v10" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></>,
  brain: <><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0z" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" /></>,
  flame: <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1 1 2 2 2 0-3-1-5 1-8z" />,
  droplet: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  footprints: <><path d="M8 3c2 0 3 2 3 5s-1 4-3 4-3-1-3-4 1-5 3-5z" /><path d="M5 15h6v2a3 3 0 0 1-6 0z" /><path d="M16 9c2 0 3 2 3 5s-1 4-3 4" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></>,
  send: <><path d="m22 2-11 11" /><path d="m22 2-7 20-4-9-9-4z" /></>,
  heart: <path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" />,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  sparkles: <><path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
  share: <><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>,
  play: <path d="M7 4v16l13-8z" />,
  pause: <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>,
  timer: <><circle cx="12" cy="12" r="9" /><polyline points="12 6 12 12 16 14" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  dumbbell: <><path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  rotate: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>,
  lightbulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  frown: <><circle cx="12" cy="12" r="9" /><path d="M8 16s1.5-2 4-2 4 2 4 2M9 9h.01M15 9h.01" /></>,
  spine: <><path d="M12 3v18" /><path d="M8 6h8M9 10h6M8 14h8M9 18h6" /></>,
  knee: <><path d="M9 3v7l-2 4v7" /><path d="M15 3v7l2 4v7" /><circle cx="12" cy="12" r="2" /></>,
  hand: <path d="M7 12V6a1.5 1.5 0 0 1 3 0v5V4.5a1.5 1.5 0 0 1 3 0V11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6c-3 0-4-1.5-6-4l-2-3a1.5 1.5 0 0 1 2.4-1.7z" />,
  neck: <><circle cx="12" cy="6" r="3" /><path d="M9 11v4l-4 3M15 11v4l4 3" /></>,
};

const Icon = ({ name, label, className = '', ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`ui-icon ${className}`.trim()}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : 'true'}
    focusable="false"
    {...rest}
  >
    {paths[name]}
  </svg>
);

export default Icon;
