import { GarageProvider } from './GarageProvider';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import useSWR, { SWRConfig } from 'swr';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';
import { useLanguage, type Locale } from '../i18n';
import type { Section } from '../../shared/catalog';
import { BookmarksProvider, useBookmarkStore } from './BookmarksProvider';
export { useSavedSections, useCounts } from './BookmarksProvider';

type Profile = { display_name: string; locale: Locale };
type Value = {
  profile: Profile | undefined;
  saveProfile: (name: string) => Promise<void>;
  changeLanguage: (locale: Locale) => Promise<void>;
  toggleSave: (section: Section) => Promise<void>;
};
const Context = createContext<Value>(null!);
export function CustomerProvider({children}:{children:ReactNode}) {
  const cache=useMemo(()=>new Map(),[]);
  return <SWRConfig value={{provider:()=>cache,dedupingInterval:30000,errorRetryCount:1,errorRetryInterval:3000,
    revalidateOnFocus:false,revalidateOnReconnect:false,keepPreviousData:false}}>
    <BookmarksProvider><CustomerState><GarageProvider>{children}</GarageProvider></CustomerState></BookmarksProvider>
  </SWRConfig>;
}
function CustomerState({children}:{children:ReactNode}) {
  const {session}=useAuth();
  const user=session!.user;
  const {setLocale,locale}=useLanguage();
  const bookmarks=useBookmarkStore();
  const {data:profile,mutate:mutateProfile}=useSWR(['profile',user.id],async()=>{
    const {data,error}=await supabase!.from('customer_profiles').select('display_name,locale').eq('user_id',user.id).maybeSingle();
    if(error)throw error;
    return data as Profile|null;
  });
  useEffect(()=>{if(profile?.locale)setLocale(profile.locale);},[profile?.locale]);
  async function updateProfile(values:Profile) {
    const payload={...values,updated_at:new Date().toISOString()};
    let result=profile ? await supabase!.from('customer_profiles').update(payload).eq('user_id',user.id)
      : await supabase!.from('customer_profiles').insert({user_id:user.id,...payload});
    if(result.error?.code==='23505')result=await supabase!.from('customer_profiles').update(payload).eq('user_id',user.id);
    if(result.error)throw result.error;
    await mutateProfile(values,{revalidate:false});
  }
  const toggleSave=useCallback((section:Section)=>bookmarks.toggle(section),[bookmarks]);
  return <Context.Provider value={{profile:profile||undefined,toggleSave,
    saveProfile:name=>updateProfile({display_name:name.trim(),locale}),
    changeLanguage:async next=>{setLocale(next);await updateProfile({display_name:profile?.display_name||'',locale:next});}}}>{children}</Context.Provider>;
}
export const useCustomer=()=>useContext(Context);
