export function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="100" height="100" fill="#000000" rx="20" />
      {/* Concentric Circles */}
      <circle cx="50" cy="50" r="45" fill="#7c3aed" />
      <circle cx="50" cy="50" r="35" fill="#8b5cf6" />
      <circle cx="50" cy="50" r="25" fill="#a78bfa" />
      <circle cx="50" cy="50" r="15" fill="#c4b5fd" />
      {/* Antenna */}
      <path d="M50 45 L35 90 L45 90 L50 65 L55 90 L65 90 Z" fill="#ffffff" />
      <path d="M38 80 L62 80" stroke="#ffffff" strokeWidth="3" />
      <path d="M43 65 L57 65" stroke="#ffffff" strokeWidth="3" />
      <path d="M49 45 L49 90" stroke="#ffffff" strokeWidth="3" />
      <circle cx="50" cy="42" r="4" fill="#ffffff" />
    </svg>
  );
}
