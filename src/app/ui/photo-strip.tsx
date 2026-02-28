export function PhotoStrip({ urls }: { urls: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group overflow-hidden rounded-lg border border-neutral-700 transition hover:border-neutral-500"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`photo ${i + 1}`}
            className="h-20 w-20 object-cover transition group-hover:scale-105 group-hover:brightness-110"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </a>
      ))}
    </div>
  );
}
