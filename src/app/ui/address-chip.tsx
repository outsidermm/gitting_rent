export function AddressChip({
  label,
  address,
  highlight,
}: {
  label: string;
  address: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-xs ${
        highlight ? "bg-neutral-700/50" : "bg-neutral-800/40"
      }`}
    >
      <p className="text-neutral-500">{label}</p>
      <p className="truncate font-mono text-neutral-300">
        {address.slice(0, 10)}…
      </p>
    </div>
  );
}
