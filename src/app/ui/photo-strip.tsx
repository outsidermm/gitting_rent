import Link from "next/link";
import Image from "next/image";

export function PhotoStrip({ urls }: { urls: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, i) => (
        <Link
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group overflow-hidden rounded-lg border border-neutral-700 transition hover:border-neutral-500"
        >
          <Image
            src={url}
            alt={`photo ${i + 1}`}
            width={80}
            height={80}
            className="h-20 w-20 object-cover transition group-hover:scale-105 group-hover:brightness-110"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </Link>
      ))}
    </div>
  );
}