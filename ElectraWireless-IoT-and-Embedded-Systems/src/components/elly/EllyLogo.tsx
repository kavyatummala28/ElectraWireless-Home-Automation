import { cn } from "@/lib/utils";

/**
 * The Elly mark: a white radio transmission tower at the center,
 * surrounded by radiating concentric purple rings, all inside a
 * perfect black circle.
 */
export function EllyLogo({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("block", className)} role="img" aria-label="ELLY">
      <defs>
        <clipPath id="elly-clip">
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>

      {/* Black circle base */}
      <circle cx="100" cy="100" r="96" fill="#000000" />

      <g clipPath="url(#elly-clip)">
        {/* Radiating concentric purple rings (centered near the tower top) */}
        <circle cx="100" cy="92" r="88" fill="#6D28D9" />
        <circle cx="100" cy="92" r="72" fill="#7C3AED" />
        <circle cx="100" cy="92" r="56" fill="#8B5CF6" />
        <circle cx="100" cy="92" r="40" fill="#A78BFA" />
        <circle cx="100" cy="92" r="24" fill="#C4B5FD" />

        {/* Optional animated pulse ring */}
        {pulse && (
          <circle
            cx="100"
            cy="92"
            r="30"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2"
            opacity="0.6"
          >
            <animate attributeName="r" values="20;90" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        )}

        {/* White transmission tower */}
        <g fill="#FFFFFF">
          {/* beacon */}
          <circle cx="100" cy="92" r="9" />
          {/* mast + legs */}
          <path d="M97 100 L78 196 H84 L100 118 L116 196 H122 L103 100 Z" />
          {/* cross braces */}
          <path d="M90 140 L110 140 L108 134 L92 134 Z" opacity="0.95" />
          <path d="M86 162 L114 162 L112 156 L88 156 Z" opacity="0.95" />
          <path d="M82 184 L118 184 L116 178 L84 178 Z" opacity="0.95" />
          {/* diagonal lattice */}
          <path d="M99 110 L84 196 H86 L100 124 L114 196 H116 L101 110 Z" opacity="0.45" />
        </g>
      </g>

      {/* crisp black ring border */}
      <circle cx="100" cy="100" r="96" fill="none" stroke="#000000" strokeWidth="4" />
    </svg>
  );
}
