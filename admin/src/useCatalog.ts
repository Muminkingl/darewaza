import { useEffect, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { PAGE_SIZE, type RootKey, type Section } from '../../shared/catalog';
import { api, type ApiError } from './telegram';

interface Page { sections: Section[]; hasMore: boolean }
export function useCatalog(root: RootKey, parent: Section | undefined, search: string, enabled: boolean) {
  const [debounced, setDebounced] = useState(search);
  useEffect(() => { const timer = setTimeout(() => setDebounced(search), 200); return () => clearTimeout(timer); }, [search]);
  const q = search ? debounced.trim() : '';
  const state = useSWRInfinite<Page, ApiError>((index, previous: Page | null) => {
    if (!enabled || parent?.is_terminal || (previous && !previous.hasMore)) return null;
    return ['catalog', root, parent?.id || '', q, index * PAGE_SIZE];
  }, async ([, currentRoot, parentId, filter, offset]: [string, string, string, string, number]) => {
    const query = new URLSearchParams({ root: currentRoot, q: filter, offset: String(offset) });
    if (parentId) query.set('parent', parentId);
    return api<Page>(`sections?${query}`);
  }, { revalidateFirstPage: false, dedupingInterval: 2500, errorRetryCount: 1, shouldRetryOnError: error => error.status === 0 || error.status === 408 || error.status >= 500, revalidateOnFocus: true, revalidateOnReconnect: true });
  return {
    sections: state.data?.flatMap(page => page.sections) || [],
    loading: state.isLoading || state.isValidating,
    error: state.error,
    hasMore: state.data?.at(-1)?.hasMore || false,
    refresh: () => state.mutate(),
    loadMore: () => state.setSize(value => value + 1),
  };
}
