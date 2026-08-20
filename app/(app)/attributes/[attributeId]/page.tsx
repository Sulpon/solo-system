import AttributePage from "../../_components/AttributePage";
import SelfDevelopmentPage from "../../_components/self-development/SelfDevelopmentPage";

export default async function Page({ params }: { params: Promise<{ attributeId: string }> }) {
  const { attributeId } = await params;
  const decodedAttributeId = decodeURIComponent(attributeId);

  if (decodedAttributeId === "self-development") {
    return <SelfDevelopmentPage />;
  }

  return <AttributePage attributeId={decodedAttributeId} />;
}
