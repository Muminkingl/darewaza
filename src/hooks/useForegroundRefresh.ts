import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// Browser focus changes (including DevTools) must not trigger catalog requests.
// Refresh mounted data only after the app was actually away for a minute.
export function useForegroundRefresh(refresh: () => unknown, enabled = true) {
  const callback=useRef(refresh);
  callback.current=refresh;
  useEffect(()=>{
    let awayAt: number|null = AppState.currentState==='background' ? Date.now() : null;
    const listener=AppState.addEventListener('change',state=>{
      if(state==='background') { if(awayAt===null)awayAt=Date.now(); return; }
      if(state!=='active')return;
      const away=awayAt;awayAt=null;
      if(enabled&&away!==null&&Date.now()-away>=60000)void callback.current();
    });
    return ()=>listener.remove();
  },[enabled]);
}
