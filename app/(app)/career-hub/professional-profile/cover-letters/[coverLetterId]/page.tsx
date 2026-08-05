import CoverLetterDetailPageClient from "../../../../_components/professional-profile/cover-letters/CoverLetterDetailPageClient";

export default async function Page({ params }: { params: Promise<{ coverLetterId: string }> }) {
  const { coverLetterId } = await params;

  return <CoverLetterDetailPageClient coverLetterId={decodeURIComponent(coverLetterId)} />;
}
