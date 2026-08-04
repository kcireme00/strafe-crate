"use client";

type Props = {
  trophy: string;
  className?: string;
  title?: string;
};

function Base({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export default function TrophyEmblem({
  trophy,
  className,
  title,
}: Props) {
  const slug = trophy.toLowerCase();

  switch (slug) {
    case "founding-member":
      return (
        <Base className={className} title={title ?? "Founding Member"}>
          <path d="M32 5 51 15v23L32 58 13 38V15L32 5Z" stroke="currentColor" strokeWidth="4" />
          <path d="m20 23 6 5 6-10 6 10 6-5-3 15H23l-3-15Z" fill="currentColor" />
        </Base>
      );

    case "first-drop":
      return (
        <Base className={className} title={title ?? "First Drop"}>
          <path d="m12 22 20-10 20 10-20 10-20-10Z" stroke="currentColor" strokeWidth="4" />
          <path d="M12 22v22l20 10V32L12 22Zm40 0v22L32 54V32l20-10Z" stroke="currentColor" strokeWidth="4" />
        </Base>
      );

    case "three-month-streak":
      return (
        <Base className={className} title={title ?? "Momentum"}>
          <path d="M12 45h10V31H12v14Zm15 0h10V22H27v23Zm15 0h10V12H42v33Z" fill="currentColor" />
        </Base>
      );

    case "six-month-collector":
      return (
        <Base className={className} title={title ?? "Dedicated Collector"}>
          <path d="m32 6 7 11 13 3-8 10 1 14-13-5-13 5 1-14-8-10 13-3 7-11Z" stroke="currentColor" strokeWidth="4" />
          <circle cx="32" cy="30" r="7" fill="currentColor" />
        </Base>
      );

    case "one-year-collector":
      return (
        <Base className={className} title={title ?? "Annual Collector"}>
          <path d="M18 49c-8-7-9-22-2-31M46 49c8-7 9-22 2-31" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path d="M22 18h20v28H22z" stroke="currentColor" strokeWidth="4" />
          <path d="M28 25h8M28 32h8M28 39h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </Base>
      );

    case "weapon-master":
      return (
        <Base className={className} title={title ?? "Weapon Master"}>
          <path d="m13 15 13 13-6 6L7 21l6-6Zm38 0L38 28l6 6 13-13-6-6Z" fill="currentColor" />
          <path d="M25 35 14 46m25-11 11 11" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </Base>
      );

    case "first-upgrade":
      return (
        <Base className={className} title={title ?? "Trade Up"}>
          <path d="M12 42h24V18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m27 26 9-9 9 9" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M52 44H28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </Base>
      );

    case "five-upgrades":
      return (
        <Base className={className} title={title ?? "Upgrade Specialist"}>
          <path d="m12 46 20-20 20 20M16 31l16-16 16 16" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </Base>
      );

    case "first-reward":
      return (
        <Base className={className} title={title ?? "Supply Runner"}>
          <path d="M12 20h40v30H12z" stroke="currentColor" strokeWidth="4" />
          <path d="M20 20v-7h24v7M24 34h16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </Base>
      );

    case "level-10":
    case "level-25":
    case "level-50": {
      const value = slug.split("-")[1];
      return (
        <Base className={className} title={title ?? `Level ${value}`}>
          <path d="M32 5 52 16v22L32 59 12 38V16L32 5Z" stroke="currentColor" strokeWidth="4" />
          <text x="32" y="38" textAnchor="middle" fill="currentColor" fontSize="19" fontWeight="900">{value}</text>
        </Base>
      );
    }

    case "community-regular":
      return (
        <Base className={className} title={title ?? "Community Regular"}>
          <path d="M10 14h44v30H31L19 54V44H10V14Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="m32 20 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z" fill="currentColor" />
        </Base>
      );

    case "event-winner":
      return (
        <Base className={className} title={title ?? "Event Champion"}>
          <path d="M22 10h20v13c0 10-5 17-10 17s-10-7-10-17V10Z" stroke="currentColor" strokeWidth="4" />
          <path d="M22 16H12v5c0 8 5 12 12 12M42 16h10v5c0 8-5 12-12 12M32 40v9m-10 5h20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </Base>
      );

    case "trivia-champion":
      return (
        <Base className={className} title={title ?? "Trivia Champion"}>
          <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="4" />
          <path d="M24 25c1-6 6-9 12-8 6 1 9 5 8 10-1 6-8 7-10 12M32 47h.01" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </Base>
      );

    case "rps-champion":
      return (
        <Base className={className} title={title ?? "RPS Champion"}>
          <path d="M14 42V26c0-3 4-3 4 0v7-14c0-3 4-3 4 0v13-16c0-3 4-3 4 0v16-13c0-3 4-3 4 0v18c0 12-6 18-16 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M39 17 53 31 39 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </Base>
      );

    case "perfect-cycle":
      return (
        <Base className={className} title={title ?? "Perfect Cycle"}>
          <circle cx="32" cy="32" r="24" stroke="currentColor" strokeWidth="4" />
          <path d="m20 33 8 8 17-18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </Base>
      );

    case "prestige-year":
      return (
        <Base className={className} title={title ?? "Prestige Loyalist"}>
          <path d="m12 25 10 7 10-18 10 18 10-7-5 23H17l-5-23Z" fill="currentColor" />
          <path d="M18 53h28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </Base>
      );

    default:
      return (
        <Base className={className} title={title ?? "Trophy"}>
          <path d="M32 7 52 18v22L32 57 12 40V18L32 7Z" stroke="currentColor" strokeWidth="4" />
          <circle cx="32" cy="32" r="7" fill="currentColor" />
        </Base>
      );
  }
}
