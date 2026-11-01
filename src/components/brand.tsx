import Link from "next/link";
import { cn } from "@/lib/utils";

export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2.6 20.2 7.3v9.4L12 21.4 3.8 16.7V7.3L12 2.6Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <path d="M12 7.1 16.6 9.8v5.4L12 17.9l-4.6-2.7V9.8L12 7.1Z" fill="currentColor" opacity="0.14" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="3.4" r="1.05" fill="currentColor" />
      <circle cx="20" cy="7.9" r="1.05" fill="currentColor" />
      <circle cx="20" cy="16.1" r="1.05" fill="currentColor" />
      <circle cx="12" cy="20.6" r="1.05" fill="currentColor" />
      <circle cx="4" cy="16.1" r="1.05" fill="currentColor" />
      <circle cx="4" cy="7.9" r="1.05" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 text-foreground", className)}
      aria-label="RepuH home"
    >
      <Mark size={compact ? 20 : 24} />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.02em]">
        Repu<span className="text-primary">H</span>
      </span>
    </Link>
  );
}
