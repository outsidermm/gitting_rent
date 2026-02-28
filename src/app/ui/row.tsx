interface RowProp {
  label: string;
  value: string;
  mono?: boolean;
}

export function Row({ label, value, mono }: RowProp) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} text-neutral-200`}
      >
        {value}
      </span>
    </div>
  );
}
