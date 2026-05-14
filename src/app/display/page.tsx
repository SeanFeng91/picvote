import { DisplayBoard } from "@/components/display-board";
import { getActivity, listWorks } from "@/lib/store";

export default async function DisplayPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: "wall" | "ranking" }>;
}) {
  const params = await searchParams;
  const [works, activity] = await Promise.all([listWorks(false), getActivity()]);
  return (
    <DisplayBoard
      initialMode={params.mode || "wall"}
      initialWorks={works}
      showPublicVotes={activity.showPublicVotes}
    />
  );
}
