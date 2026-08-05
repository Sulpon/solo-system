import ManuscriptChapterDetailPageClient from "../../../_components/thesis/ManuscriptChapterDetailPageClient";

export default async function Page({ params }: { params: Promise<{ chapterKey: string }> }) {
  const { chapterKey } = await params;

  return <ManuscriptChapterDetailPageClient chapterKey={decodeURIComponent(chapterKey)} />;
}
