"use client";

/** Runs before paint so there is no flash. Lenso defaults to dark; a visitor's choice sticks. */
export const themeScript = `try{var q=new URLSearchParams(location.search).get("theme");if(q==="light"||q==="dark"){localStorage.setItem("lenso-theme",q)}var t=localStorage.getItem("lenso-theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

/* Half-filled circle, the "contrast" glyph the Better Auth family of sites uses for the theme switch. */
function ContrastIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" className={className} aria-hidden>
      <circle cx="8" cy="8" r="6.3" />
      <path d="M8 1.7a6.3 6.3 0 0 1 0 12.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("lenso-theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between dark and light"
      title="Theme"
      className="group grid size-8 cursor-pointer place-items-center text-muted transition-colors hover:text-fg"
    >
      <ContrastIcon className="transition-transform duration-500 ease-out group-hover:rotate-180 dark:rotate-180 dark:group-hover:rotate-0" />
    </button>
  );
}
