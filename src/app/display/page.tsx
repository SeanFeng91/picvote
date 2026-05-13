import { DisplayBoard } from "@/components/display-board";
import { listWorks } from "@/lib/store";

export default function DisplayPage({
  searchParams
}: {
  searchParams: { mode?: "wall" | "ranking" };
}) {
  return <DisplayBoard initialMode={searchParams.mode || "wall"} initialWorks={listWorks(false)} />;
}
