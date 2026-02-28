import { type RouterOutputs } from "~/trpc/react";

export type Lease = RouterOutputs["lease"]["getByAddress"][number];