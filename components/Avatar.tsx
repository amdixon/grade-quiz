"use client";

const palette = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e", "#3b82f6"];
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({ name, photo, className = "avatar" }: { name: string; photo?: string; className?: string }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={`/photos/${photo}`} alt={name} />;
  }
  return (
    <div className={`${className} fallback`} style={{ background: palette[hash(name) % palette.length] }} aria-label={name}>
      {initials(name)}
    </div>
  );
}
