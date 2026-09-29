/** PRISM mark: a prism splitting one beam (monitoring data) into insight. */
export function PrismMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="9" fill="#111111" />
      <path d="M20 8 L31 29 H9 Z" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M3 22 L15.5 19.5" stroke="#a8a8a3" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M24.5 19 L37 14" stroke="#8a8a85" strokeWidth="2" strokeLinecap="round" />
      <path d="M25 21 L37 21" stroke="#e8871e" strokeWidth="2" strokeLinecap="round" />
      <path d="M24.5 23 L37 28" stroke="#63635f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
