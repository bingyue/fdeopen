import { notFound } from 'next/navigation';
import { CatalogPage } from '@/components/catalog-page';
import { kinds, type Kind } from '@/lib/types';
export function sectionKind(section: string) {
  return (Object.keys(kinds) as Kind[]).find((k) => kinds[k].path === `/${section}`);
}
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const kind = sectionKind(section);
  return kind ? { title: kinds[kind].label, alternates: { canonical: kinds[kind].path } } : {};
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  const kind = sectionKind(section);
  if (!kind) notFound();
  return <CatalogPage kind={kind} params={await searchParams} />;
}
