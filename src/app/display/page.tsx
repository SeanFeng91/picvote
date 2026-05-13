import { DisplayBoard } from "@/components/display-board";
import { getActivity, listWorks } from "@/lib/store";

export default async function DisplayPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: "wall" | "ranking" }>;
}) {
  const params = await searchParams;
  return (
    <DisplayBoard
      initialMode={params.mode || "wall"}
      initialWorks={listWorks(false)}
      showPublicVotes={getActivity().showPublicVotes}
    />
  );
}
