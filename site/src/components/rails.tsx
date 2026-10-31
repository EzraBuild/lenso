/* The two vertical lines that frame the page, and the "+" ticks where a
   section border crosses them. Decorative only. */

export function Rails() {
  return <div className="rails" aria-hidden />;
}

function Plus({ className = "" }: { className?: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" className={`absolute text-dim ${className}`} aria-hidden>
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Drop inside a `relative` section that has a top border. */
export function Crosshairs({ bottom = false }: { bottom?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-10 hidden min-[80rem]:block" aria-hidden>
      <div className="relative mx-auto h-full max-w-6xl">
        <Plus className="-top-[6px] -left-[6px]" />
        <Plus className="-top-[6px] -right-[6px]" />
        {bottom && (
          <>
            <Plus className="-bottom-[6px] -left-[6px]" />
            <Plus className="-bottom-[6px] -right-[6px]" />
          </>
        )}
      </div>
    </div>
  );
}
