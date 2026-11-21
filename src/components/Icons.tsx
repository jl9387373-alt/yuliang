import type { ReactElement, ReactNode } from "react";
import type { ExpenseCategory, IncomeCategory } from "../types";

type IconProps = {
  size?: number;
  className?: string;
};

function Svg({
  size = 18,
  className,
  children,
  label,
}: IconProps & { children: ReactNode; label?: string }) {
  return (
    <svg
      className={className ? `ico ${className}` : "ico"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {children}
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function IconBills(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Svg>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </Svg>
  );
}

export function IconWallet(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a1 1 0 0 1 1 1v2" />
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconSpark(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </Svg>
  );
}

export function IconChart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19h16" />
      <path d="M7 16V10M12 16V7M17 16v-4" />
    </Svg>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </Svg>
  );
}

export function IconLeaf(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 19c6-1 11-6 12-14 0 0-7 1-12 8-1.5 2-1.5 4.5 0 6z" />
      <path d="M9 15c2-2 5-4 8-5" />
    </Svg>
  );
}

export function IconFood(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 4v8a2 2 0 1 0 4 0V4" />
      <path d="M10 14v7" />
      <path d="M16 4v17" />
      <path d="M16 4c2.5 0 3.5 2 3.5 4S18.5 11 16 11" />
    </Svg>
  );
}

export function IconBus(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16M8 17v2M16 17v2M7 14.5h.01M17 14.5h.01" />
    </Svg>
  );
}

export function IconFun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 10.5h.01M15.5 10.5h.01M8.8 14.5c1 .9 2.2 1.4 3.2 1.4s2.2-.5 3.2-1.4" />
    </Svg>
  );
}

export function IconBook(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z" />
      <path d="M5 5.5V21.5" />
    </Svg>
  );
}

export function IconBag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 8h12l-1 11H7z" />
      <path d="M9 8V6.5A3 3 0 0 1 15 6.5V8" />
    </Svg>
  );
}

export function IconOther(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="6.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconCoin(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.5c.6-.7 1.5-1 2.5-1 1.7 0 3 1 3 2.5S13.7 13.5 12 13.5 9 14.5 9 16c0 .9.7 1.6 2 1.9" />
    </Svg>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function IconUpload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 14V4M8 7l4-4 4 4" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function IconSave(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v5h7V4M8 20v-7h8v7" />
    </Svg>
  );
}

export function IconWarn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4 3.5 19h17z" />
      <path d="M12 10v4M12 16.5h.01" />
    </Svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5l3 2" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5 11 15l4.5-5" />
    </Svg>
  );
}

export function IconShield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
      <path d="M9.5 12.2 11.2 14l3.5-3.8" />
    </Svg>
  );
}

export function IconFilter(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Svg>
  );
}

export function IconOut(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v10M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function IconIn(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 15V5M8 9l4-4 4 4" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function IconPiggy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16 9.5c2.2.4 3.5 1.8 3.5 3.7 0 2.4-2.4 4.3-6.5 4.3h-1c-3.2 0-5.5-1.4-5.5-3.8V12c0-2.4 2-4.2 5-4.5" />
      <path d="M9.5 8.2C8.2 7 7.8 5.5 8.5 4.5" />
      <circle cx="14.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
      <path d="M5.5 13.5H4" />
    </Svg>
  );
}

export function IconTag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 11.5V5h6.5L20 14.5 13.5 21z" />
      <circle cx="8.2" cy="8.2" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconNote(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h8l3 3v13H7z" />
      <path d="M15 4v4h4M9 12h6M9 16h4" />
    </Svg>
  );
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </Svg>
  );
}

export function IconHelp(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.8.4-1.3 1-1.3 1.8V14.5M12 17h.01" />
    </Svg>
  );
}

export function IconLock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function IconSmile(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 10.2h.01M15.5 10.2h.01M8.8 14.2c1 .9 2.2 1.4 3.2 1.4s2.2-.5 3.2-1.4" />
    </Svg>
  );
}

export function IconFrown(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 10.2h.01M15.5 10.2h.01M15.2 15.5c-1-.9-2.2-1.4-3.2-1.4s-2.2.5-3.2 1.4" />
    </Svg>
  );
}

export function IconStar(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 3.5 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.4l.9-5.4L4.2 9.2l5.4-.8z" />
    </Svg>
  );
}

export function IconUndo(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 7 5 11l4 4" />
      <path d="M5 11h9a4 4 0 1 1 0 8h-2" />
    </Svg>
  );
}

export function IconInbox(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="m4 8 3.2-4h9.6L20 8M4 13h4l1.5 2h5L16 13h4" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  );
}

export function IconArrow(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h12M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconZap(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 3 6 14h5l-1 7 7-11h-5z" />
    </Svg>
  );
}

export function IconHeart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.6 12 20 12 20z" />
    </Svg>
  );
}

export function IconGift(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="4" y="10" width="16" height="10" rx="1.5" />
      <path d="M12 10v10M4 14h16M12 10c-2.2 0-4-1.3-4-3s2.5-2.2 4-.5c1.5-1.7 4-1 4 .5s-1.8 3-4 3z" />
    </Svg>
  );
}

export function IconTarget(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconList(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 7h11M8 12h11M8 17h11" />
      <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

const CATEGORY_ICONS: Record<
  ExpenseCategory | IncomeCategory,
  (p: IconProps) => ReactElement
> = {
  food: IconFood,
  transport: IconBus,
  entertainment: IconFun,
  study: IconBook,
  shopping: IconBag,
  other: IconOther,
  extra: IconCoin,
};

export function CategoryIcon({
  id,
  size = 16,
  className,
}: {
  id: ExpenseCategory | IncomeCategory;
  size?: number;
  className?: string;
}) {
  const Comp = CATEGORY_ICONS[id] ?? IconOther;
  return <Comp size={size} className={className} />;
}
