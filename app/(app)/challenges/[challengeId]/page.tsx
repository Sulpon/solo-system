import ChallengeDetailPageClient from "../../_components/challenges/ChallengeDetailPageClient";

export default async function Page({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  return <ChallengeDetailPageClient challengeId={decodeURIComponent(challengeId)} />;
}
