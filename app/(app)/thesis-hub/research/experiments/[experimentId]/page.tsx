import ExperimentDetailPageClient from "../../../../_components/thesis/ExperimentDetailPageClient";

export default async function Page({ params }: { params: Promise<{ experimentId: string }> }) {
  const { experimentId } = await params;

  return <ExperimentDetailPageClient experimentId={decodeURIComponent(experimentId)} />;
}
