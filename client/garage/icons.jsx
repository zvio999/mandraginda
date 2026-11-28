function Svg({ children, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function MountainIcon() {
  return <Svg size={20}><path d="m8 3 4 8 5-5 5 15H2L8 3z" /></Svg>;
}

export function ArrowLeftIcon() {
  return <Svg><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>;
}

export function ImagePlusIcon() {
  return <Svg size={20}><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" /><path d="M16 5h6" /><path d="M19 2v6" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></Svg>;
}

export function PanelLeftCloseIcon() {
  return <Svg><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" /></Svg>;
}

export function PanelLeftOpenIcon() {
  return <Svg><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" /></Svg>;
}

export function PanelRightCloseIcon() {
  return <Svg><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /><path d="m8 9 3 3-3 3" /></Svg>;
}

export function PanelRightOpenIcon() {
  return <Svg><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /><path d="m10 15-3-3 3-3" /></Svg>;
}

export function TrashIcon() {
  return <Svg size={14}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></Svg>;
}

export function CheckIcon({ size = 12 }) {
  return <Svg size={size}><path d="M20 6 9 17l-5-5" /></Svg>;
}

export function CloseIcon() {
  return <Svg><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>;
}

export function PencilIcon() {
  return <Svg size={12}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>;
}

export function LightbulbIcon() {
  return <Svg><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2a7 7 0 0 0-4-12z" /></Svg>;
}

export function LockIcon() {
  return <Svg size={10}><rect width="14" height="10" x="5" y="11" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>;
}

export function WrenchIcon() {
  return <Svg size={14}><path d="M14.7 6.3a4.5 4.5 0 0 0-6.4 6.4L3 18l2.3-5.3a4.5 4.5 0 0 0 6.4-6.4z" /></Svg>;
}

export function MouseIcon() {
  return <Svg><rect width="12" height="18" x="6" y="3" rx="6" /><path d="M12 7v4" /></Svg>;
}

export function RotateIcon({ spinning }) {
  return (
    <span className={spinning ? "spin" : undefined}>
      <Svg size={14}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></Svg>
    </span>
  );
}
