import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { PAGE_SIZE, type RootKey, type Section } from '../../shared/catalog';

export function useSections(root: RootKey | null, parent: string | null, search: string) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);
  const items = useRef<Section[]>([]);
  const busy = useRef(false);

  const load = useCallback(async (append = false) => {
    if (!root || (append && busy.current)) return;
    const id = ++requestId.current;
    busy.current = true;
    setLoading(true); setError(false);
    try {
      if (!supabase) throw new Error('Missing public Supabase configuration.');
      const offset = append ? items.current.length : 0;
      let query = supabase.from('catalog_sections').select('*').eq('root_key', root)
        .order('position').order('created_at').order('id').range(offset, offset + PAGE_SIZE);
      query = parent ? query.eq('parent_id', parent) : query.is('parent_id', null);
      // Escape SQL LIKE wildcards so a search is treated as text.
      if (search.trim()) query = query.ilike('search_name', `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      if (id !== requestId.current) return;
      const page = (data || []) as Section[];
      const next = append ? [...items.current, ...page.slice(0, PAGE_SIZE)] : page.slice(0, PAGE_SIZE);
      items.current = next; setSections(next); setHasMore(page.length > PAGE_SIZE);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) { busy.current = false; setLoading(false); }
    }
  }, [root, parent, search]);

  useEffect(() => {
    ++requestId.current; busy.current = false; items.current = [];
    setSections([]); setHasMore(false); setError(false); setLoading(Boolean(root));
    const timer = setTimeout(() => { void load(); }, 180);
    return () => { clearTimeout(timer); ++requestId.current; };
  }, [load, root]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => subscription.remove();
  }, [load]);
  return { sections, loading, error, hasMore, refresh: () => load(), loadMore: () => load(true) };
}
