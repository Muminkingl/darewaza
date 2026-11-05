import type { Section, SectionIcon } from './catalog';

export const PDF_PART_ICON: SectionIcon = 'wrench';

export interface PdfPart {
  key: string;
  name: string;
  name_en: string;
  name_ar: string;
  scope: 'all' | string[];
  sources: { document: string; row: number }[];
}
export interface ImportEntry { part: PdfPart; parent: Section; company: Section; existing?: Section; action: 'insert' | 'adopt' | 'skip'; position: number }
export const importSourceKey = (part: PdfPart) => `pdf:${part.key}`;
const normalizedName = (name: string) => name.normalize('NFC').replace(/\s+/g, '').toLocaleLowerCase('en');
export const isYearBranch = (name: string) => /(?:19|20)\d{2}|(?:^|[\s_-])\d{2}\s*[-–]\s*\d{2}(?:$|\s)/.test(name);

// Scope comes only from the company ancestor; a model with a similar name cannot
// accidentally receive a restricted part. Never descend into custom part groups.
export function planPdfImport(sections: (Section & { source_key?: string | null })[], parts: PdfPart[], excludedPartsByParent: Record<string, string[]> = {}): ImportEntry[] {
  const children = new Map<string, typeof sections>();
  for (const row of sections) if (row.parent_id) {
    const siblings = children.get(row.parent_id) || [];
    siblings.push(row); children.set(row.parent_id, siblings);
  }
  const entries: ImportEntry[] = [];
  const keys = new Set<string>();
  for (const part of parts) {
    if (keys.has(part.key)) throw new Error(`Duplicate part key: ${part.key}`);
    keys.add(part.key);
    for (const name of [part.name, part.name_en, part.name_ar]) {
      if (!name.trim() || name.length > 100) throw new Error(`Invalid translation: ${part.key}`);
    }
  }
  for (const company of sections.filter(s => s.root_key === 'parts' && !s.parent_id)) {
    const applicable = parts.filter(p => p.scope === 'all' || p.scope.includes(company.name.trim().toUpperCase()));
    function addAt(parent: Section) {
      if (parent.is_terminal) throw new Error(`Cannot import categories into a product: ${company.name}/${parent.name}`);
      const siblings = children.get(parent.id) || [];
      const firstPosition = siblings.reduce((max, s) => Math.max(max, s.position), -1) + 1;
      applicable.forEach((part, index) => {
        // Keep explicit branch-level removals removed on subsequent PDF imports.
        if (excludedPartsByParent[parent.id]?.includes(part.key)) return;
        const tagged = siblings.find(s => s.source_key === importSourceKey(part));
        const matches = tagged ? [tagged] : siblings.filter(s => !s.source_key && normalizedName(s.name) === normalizedName(part.name));
        if (matches.length > 1) throw new Error(`Ambiguous existing category: ${company.name}/${parent.name}/${part.name}`);
        const existing = matches[0];
        if (existing?.is_terminal && !tagged) throw new Error(`An existing product has the category name: ${existing.name}`);
        entries.push({ part, parent, company, existing, action: tagged ? 'skip' : existing ? 'adopt' : 'insert', position: firstPosition + index });
      });
    }
    function visitModel(model: Section) {
      const years = (children.get(model.id) || []).filter(s => isYearBranch(s.name));
      if (years.length) for (const year of years) visitModel(year);
      else addAt(model);
    }
    for (const model of children.get(company.id) || []) visitModel(model);
  }
  return entries;
}
