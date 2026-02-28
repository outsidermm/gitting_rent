export function PhotoStrip({ urls }: { urls: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`photo ${i + 1}`}
            className="h-16 w-16 rounded-md border border-neutral-700 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </a>
      ))}
    </div>
  );
}