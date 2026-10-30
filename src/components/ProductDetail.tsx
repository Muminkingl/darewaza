import { useEffect, useState } from 'react';
import { AppState, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ImageOff, Maximize2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice, imageUrl, type Section } from '../../shared/catalog';
import { supabase } from '../lib/supabase';
import { colors, font } from '../theme';

export function ProductDetail({ initial, onUpdate }: { initial: Section; onUpdate: (section: Section) => void }) {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const url = imageUrl(process.env.EXPO_PUBLIC_SUPABASE_URL, section.image_path);
  async function refresh() {
    setRefreshing(true); setError('');
    try {
      if (!supabase) throw new Error('not configured');
      const { data, error } = await supabase.from('catalog_sections').select('*').eq('id', initial.id).eq('root_key', initial.root_key).maybeSingle();
      if (error) throw error;
      if (!data) { setError('ئەم کاڵایە ئێستا بەردەست نییە.'); return; }
      setSection(data as Section); onUpdate(data as Section);
    } catch { setError('پەیوەندییەکە سەرکەوتوو نەبوو. بۆ نوێکردنەوە پەڕەکە بۆ خوارەوە ڕابکێشە.'); }
    finally { setRefreshing(false); }
  }
  useEffect(() => {
    void refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => listener.remove();
  }, [initial.id]);
  return <>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />}>
      <View style={styles.card}>
        <Pressable style={styles.hero} onPress={() => { if (url && failedImage !== url) setZoom(true); }} accessibilityRole="button" accessibilityLabel="بینینی وێنە بە گەورەیی">
          {url && failedImage !== url ? <><Image source={{ uri: url }} style={styles.image} resizeMode="contain" accessibilityLabel={section.name} onError={() => setFailedImage(url)} /><View style={styles.expand}><Maximize2 size={18} color="#7898BA" /></View></> : <View style={styles.noImage}><ImageOff size={36} color="#A4B8CF" strokeWidth={1.3} /><Text style={styles.noImageText}>وێنە بەردەست نییە</Text></View>}
        </Pressable>
        <View style={styles.info}><Text style={styles.label}>کاڵای کۆتایی</Text><Text style={styles.title}>{section.name}</Text>{!!section.description && <Text style={styles.description}>{section.description}</Text>}
          <View style={styles.prices}>{section.price_usd != null && <View style={styles.price}><Text style={styles.priceLabel}>نرخ بە دۆلار</Text><Text style={styles.priceValue}>{formatPrice(section.price_usd, 'USD')}</Text></View>}{section.price_iqd != null && <View style={styles.price}><Text style={styles.priceLabel}>نرخ بە دینار</Text><Text style={styles.priceValue}>{formatPrice(section.price_iqd, 'IQD')}</Text></View>}</View>
        </View>
      </View>
      {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
    </ScrollView>
    <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}><View style={[styles.zoom, { paddingTop: insets.top + 55, paddingBottom: insets.bottom + 25 }]}><Pressable style={[styles.close, { top: insets.top + 14 }]} accessibilityRole="button" accessibilityLabel="داخستن" onPress={() => setZoom(false)}><X size={25} color="white" /></Pressable>{url && <Image source={{ uri: url }} style={styles.zoomImage} resizeMode="contain" accessibilityLabel={section.name} />}</View></Modal>
  </>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderWidth: 1, borderColor: '#E3EAF2', borderRadius: 23, backgroundColor: 'white', overflow: 'hidden' },
  hero: { width: '100%', aspectRatio: 1.45, backgroundColor: '#F0F5FB', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' }, expand: { position: 'absolute', left: 14, bottom: 14, backgroundColor: 'white', borderRadius: 11, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  noImage: { gap: 12, alignItems: 'center' }, noImageText: { fontFamily: font.regular, fontSize: 11, color: '#9CAFC5' },
  info: { padding: 21 }, label: { fontFamily: font.medium, fontSize: 10, color: '#80A0BF', textAlign: 'right' }, title: { fontFamily: font.bold, fontSize: 23, color: colors.ink, textAlign: 'right', marginTop: 7 },
  description: { fontFamily: font.regular, fontSize: 12, lineHeight: 27, textAlign: 'right', color: colors.muted, marginTop: 8 },
  prices: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginTop: 22 }, price: { flex: 1, minWidth: 120, backgroundColor: '#F4F8FC', borderColor: '#E8EEF5', borderWidth: 1, borderRadius: 15, padding: 14 },
  priceLabel: { fontFamily: font.regular, fontSize: 10, color: '#8A9FB7', textAlign: 'right' }, priceValue: { fontFamily: font.bold, fontSize: 19, color: '#24456F', marginTop: 9, textAlign: 'right' },
  error: { fontFamily: font.regular, color: colors.muted, fontSize: 11, textAlign: 'right', lineHeight: 25, marginTop: 18 },
  zoom: { flex: 1, backgroundColor: '#101E33F8', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' }, zoomImage: { flex: 1, width: '100%', height: '100%' }, close: { position: 'absolute', right: 20, width: 42, height: 42, backgroundColor: '#FFFFFF16', borderRadius: 13, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
});
