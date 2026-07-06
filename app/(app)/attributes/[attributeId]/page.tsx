import AttributePage from "../../_components/AttributePage";

export default async function Page({ params }: { params: Promise<{ attributeId: string }> }) {
  const { attributeId } = await params;

  return <AttributePage attributeId={decodeURIComponent(attributeId)} />;
}
