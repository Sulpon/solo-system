import AttributePage from "../../_components/AttributePage";
import SelfDevelopmentPage from "../../_components/self-development/SelfDevelopmentPage";
import CareerCommandCenterPage from "../../_components/career/CareerCommandCenterPage";

export default async function Page({ params }: { params: Promise<{ attributeId: string }> }) {
  const { attributeId } = await params;
  const decodedAttributeId = decodeURIComponent(attributeId);

  if (decodedAttributeId === "self-development") {
    return <SelfDevelopmentPage />;
  }

  if (decodedAttributeId === "career") {
    return <CareerCommandCenterPage />;
  }

  return <AttributePage attributeId={decodedAttributeId} />;
}
