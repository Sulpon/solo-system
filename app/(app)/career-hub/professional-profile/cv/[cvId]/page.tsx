import CvDetailPageClient from "../../../../_components/professional-profile/cv/CvDetailPageClient";

export default async function Page({ params }: { params: Promise<{ cvId: string }> }) {
  const { cvId } = await params;

  return <CvDetailPageClient cvId={decodeURIComponent(cvId)} />;
}
