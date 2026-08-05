import VacancyDetailPageClient from "../../../../../_components/companies/VacancyDetailPageClient";

export default async function Page({ params }: { params: Promise<{ companyId: string; vacancyId: string }> }) {
  const { companyId, vacancyId } = await params;

  return <VacancyDetailPageClient companyId={decodeURIComponent(companyId)} vacancyId={decodeURIComponent(vacancyId)} />;
}
