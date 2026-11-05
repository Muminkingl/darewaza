import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { LocalBookmarks } from '../../shared/localBookmarks';
import { deviceBookmarks } from '../lib/bookmarks';
import { useAuth } from './AuthProvider';
const Context = createContext<LocalBookmarks>(null!);
export function BookmarksProvider({children}:{children:ReactNode}) {
  const {session}=useAuth();
  const store=useMemo(()=>deviceBookmarks(session!.user.id),[session!.user.id]);
  useEffect(()=>{void store.load().catch(()=>{});},[store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export const useBookmarkStore=()=>useContext(Context);
export function useBookmark(id:string) {
  const store=useBookmarkStore();
  const subscribe=useCallback((listener:()=>void)=>store.subscribeItem(id,listener),[store,id]);
  const get=useCallback(()=>store.has(id),[store,id]);
  return useSyncExternalStore(subscribe,get,get);
}
export function useSavedSections() {
  const store=useBookmarkStore();
  const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
  const [limit,setLimit]=useState(40);
  const sections=useMemo(()=>snapshot.sections.slice(0,limit),[snapshot.sections,limit]);
  return {sections,loading:!snapshot.ready,error:snapshot.error,hasMore:limit<snapshot.sections.length,localOnly:true,
    refresh:()=>store.retry(),loadMore:()=>setLimit(n=>n+40)};
}
export function useCounts() {
  const store=useBookmarkStore();
  const saved=useSyncExternalStore(store.subscribe,store.getCount,store.getCount);
  return {data:{saved}};
}
