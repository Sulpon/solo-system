import CompanyDetailPageClient from "../../../_components/companies/CompanyDetailPageClient";

export default async function Page({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  return <CompanyDetailPageClient companyId={decodeURIComponent(companyId)} />;
}
