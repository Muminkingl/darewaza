import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const STORAGE_KEY = 'sayara.location.v1';
const knownCities: [RegExp, string][] = [
  [/erbil|hawler|arbil|أربيل/i, 'هەولێر'], [/sulayman|sulaiman|slemani|السليمانية/i, 'سلێمانی'],
  [/duhok|dohuk|دهوك/i, 'دهۆک'], [/kirkuk|كركوك/i, 'کەرکووک'],
  [/baghdad|بغداد/i, 'بەغدا'], [/halabja|حلبجة/i, 'هەڵەبجە'], [/mosul|الموصل/i, 'مووسڵ'],
];

export function useLocation() {
  const [city, setCity] = useState('شار هەڵبژێرە');
  const [visible, setVisible] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState('');
  const generation = useRef(0);
  const selectedCity = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (!live) return;
      if (value) { const stored = JSON.parse(value); if (typeof stored.city === 'string' && stored.city.trim()) { selectedCity.current = stored.city; setCity(stored.city); } }
      else setVisible(true);
    }).catch(() => { if (live) setVisible(true); });
    return () => { live = false; ++generation.current; };
  }, []);

  const select = useCallback(async (name: string) => {
    const trimmed = name.trim().slice(0, 80);
    if (!trimmed) return;
    ++generation.current; selectedCity.current = trimmed; setCity(trimmed); setVisible(false); setMessage(''); setDetecting(false);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ city: trimmed })).catch(() => {});
  }, []);

  const close = useCallback(() => {
    ++generation.current; setVisible(false); setDetecting(false);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCity.current ? { city: selectedCity.current } : {})).catch(() => {});
  }, []);

  const detect = useCallback(async () => {
    if (detecting) return;
    const current = ++generation.current;
    setDetecting(true); setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        if (current === generation.current) setMessage('هیچ کێشەیەک نییە، دەتوانیت شارەکەت بە دەست هەڵبژێریت.');
        return;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 12_000); });
      const position = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), timeout]).finally(() => clearTimeout(timer));
      let name = '';
      if (Platform.OS !== 'web') {
        const addresses = await Location.reverseGeocodeAsync(position.coords);
        const address = addresses[0];
        name = address?.city || address?.subregion || address?.region || '';
      } else {
        // Native geocoding is unavailable on web. Match nearby cities without sending coordinates to a third party.
        const cities = [{ name: 'هەولێر', lat: 36.191, lng: 44.009 }, { name: 'سلێمانی', lat: 35.558, lng: 45.435 }, { name: 'دهۆک', lat: 36.867, lng: 42.95 }, { name: 'کەرکووک', lat: 35.468, lng: 44.392 }, { name: 'بەغدا', lat: 33.315, lng: 44.366 }, { name: 'هەڵەبجە', lat: 35.177, lng: 45.986 }, { name: 'مووسڵ', lat: 36.335, lng: 43.119 }];
        const nearest = cities.map(c => ({ ...c, distance: Math.hypot(c.lat - position.coords.latitude, (c.lng - position.coords.longitude) * Math.cos(position.coords.latitude * Math.PI / 180)) })).sort((a, b) => a.distance - b.distance)[0];
        if (nearest.distance < 0.45) name = nearest.name;
      }
      if (current !== generation.current) return;
      if (!name) { setMessage('تکایە ناوی شارەکەت هەڵبژێرە.'); return; }
      await select(knownCities.find(([pattern]) => pattern.test(name))?.[1] || name);
    } catch {
      if (current === generation.current) setMessage('شوێنەکە دیاری نەکرا. دەتوانیت شارەکەت بە دەست هەڵبژێریت.');
    } finally { if (current === generation.current) setDetecting(false); }
  }, [detecting, select]);
  return { city, visible, detecting, message, select, close, detect, open: () => { setMessage(''); setVisible(true); } };
}
