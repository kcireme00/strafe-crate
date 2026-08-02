"use client";

type TierEmblemProps = {
  tier: string;
  className?: string;
  decorative?: boolean;
};

function RecruitIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 10 99 25v31c0 25-15 43-39 54C36 99 21 81 21 56V25L60 10Z" />
      <path className="cut" d="M60 25 85 35v20c0 15-8 27-25 36-17-9-25-21-25-36V35l25-10Z" />
      <path d="M55 35h10v42H55zM39 51h42v10H39z" />
    </svg>
  );
}

function OperativeIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="m26 30 13-6 28 48-13 8-10-17-9 5-7-12 9-5-11-21Zm68 0-13-6-28 48 13 8 10-17 9 5 7-12-9-5 11-21Z" />
      <path d="M47 77h26l-5 17H52l-5-17Z" />
    </svg>
  );
}

function VanguardIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <g transform="rotate(42 60 60)">
        <path d="M15 50h66v9H15zM71 43h21v23H71zM92 48h15v12H92zM34 59h12l5 20H37zM18 44h28v6H18z" />
      </g>
      <g transform="rotate(-42 60 60)">
        <path d="M15 50h66v9H15zM71 43h21v23H71zM92 48h15v12H92zM34 59h12l5 20H37zM18 44h28v6H18z" />
      </g>
      <path d="M60 48 74 61 60 74 46 61 60 48Z" />
    </svg>
  );
}

function EliteIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 20 76 43l28-10-15 27 17 22-31-3-15 24-15-24-31 3 17-22-15-27 28 10L60 20Z" />
      <path className="cut" d="m60 43 9 14-9 14-9-14 9-14Z" />
      <path d="M27 85 44 90 60 108 76 90 93 85 78 105H42L27 85Z" />
    </svg>
  );
}

function MasterIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="m22 38 18 13 20-31 20 31 18-13-8 45H30l-8-45Z" />
      <path d="M32 87h56v12H32z" />
      <path className="cut" d="m60 39 9 18-9 13-9-13 9-18Z" />
      <path d="M12 60c9 7 15 18 18 31l-10 7C17 83 11 74 4 69l8-9Zm96 0c-9 7-15 18-18 31l10 7c3-15 9-24 16-29l-8-9Z" />
    </svg>
  );
}

function PrestigeIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 10 90 28l18 32-18 32-30 18-30-18-18-32 18-32L60 10Z" />
      <path className="cut" d="m60 30 18 12 8 20-13 20H47L34 62l8-20 18-12Z" />
      <path d="M42 45h36l-4 11H46l-4-11Zm8 17h20l-3 23H53l-3-23Z" />
      <path d="m38 88 22-11 22 11-22 14-22-14Z" />
    </svg>
  );
}

export default function TierEmblem({
  tier,
  className = "",
  decorative = false,
}: TierEmblemProps) {
  const normalized = tier.toLowerCase();

  const icon =
    normalized === "recruit" ? <RecruitIcon /> :
    normalized === "operative" ? <OperativeIcon /> :
    normalized === "vanguard" ? <VanguardIcon /> :
    normalized === "elite" ? <EliteIcon /> :
    normalized === "master" ? <MasterIcon /> :
    normalized === "prestige" ? <PrestigeIcon /> :
    <RecruitIcon />;

  return (
    <span
      className={`tier-rank-emblem tier-rank-${normalized} ${className}`.trim()}
      aria-label={decorative ? undefined : `${tier} membership emblem`}
      aria-hidden={decorative ? "true" : undefined}
    >
      {icon}
    </span>
  );
}
