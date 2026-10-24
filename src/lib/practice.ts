import packs from '../../content/practice-packs.json';
export { packs };
const quoteCases = [
  'field-fde-031',
  'caict-2025-01',
  'caict-2025-08',
  'caict-2025-12',
  'caict-2025-26',
  'caict-2025-32',
  'dw-fde-006',
  'dw-fde-009',
  'dw-fde-010',
  'dw-fde-021',
  'dw-fde-022',
];
const marketingCases = ['field-fde-066', 'field-fde-069', 'dw-fde-005', 'dw-fde-012'];
export function practiceForCase(slug: string) {
  return packs.find(
    (p) =>
      p.slug ===
      (quoteCases.includes(slug)
        ? 'quotation-check'
        : marketingCases.includes(slug)
          ? 'marketing-review'
          : 'knowledge-eval'),
  )!;
}
