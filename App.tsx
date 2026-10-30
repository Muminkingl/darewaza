import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, FlatList, Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { ArrowLeft, ArrowRight, Car, Check, ChevronDown, ChevronLeft, Disc3, Folder, Layers, LocateFixed, MapPin, Package, Search, Settings, Sparkles, Wrench, X, Zap } from 'lucide-react-native';
import { ROOTS, formatPrice, imageUrl, type RootKey, type Section, type SectionIcon } from './shared/catalog';
import { ProductDetail } from './src/components/ProductDetail';
import { useSections } from './src/hooks/useSections';
import { useLocation } from './src/hooks/useLocation';
import { LocationSheet } from './src/components/LocationSheet';
import { CatalogArt } from './src/components/CatalogArt';
import { colors, font } from './src/theme';

const icons = { folder: Folder, car: Car, settings: Settings, wrench: Wrench, disc: Disc3, sparkles: Sparkles, package: Package, zap: Zap };

function SectionGlyph({ name, size = 24 }: { name: SectionIcon; size?: number }) {
  const Icon = icons[name] || Folder;
  return <Icon size={size} strokeWidth={1.7} color={colors.blue} />;
}

function CustomerApp() {
  const insets = useSafeAreaInsets();
  const location = useLocation();
  const [root, setRoot] = useState<RootKey | null>(null);
  const [trail, setTrail] = useState<Section[]>([]);
  const [search, setSearch] = useState('');
  const rootInfo = ROOTS.find(item => item.key === root);
  const current = trail[trail.length - 1];
  const catalog = useSections(current?.is_terminal ? null : root, current?.id || null, search);
  const transition = useRef(new Animated.Value(1)).current;

  function navigate(nextRoot: RootKey | null, nextTrail: Section[] = []) {
    setRoot(nextRoot); setTrail(nextTrail); setSearch('');
    transition.setValue(0);
    Animated.timing(transition, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }
  function back() { if (trail.length) navigate(root, trail.slice(0, -1)); else navigate(null); }
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (location.visible) { location.close(); return true; }
      if (!root) return false;
      if (trail.length) { setTrail(previous => previous.slice(0, -1)); setSearch(''); } else { setRoot(null); setSearch(''); }
      return true;
    });
    return () => handler.remove();
  }, [root, trail.length, location.visible, location.close]);

  const homeCards = ROOTS.filter(item => `${item.name} ${item.subtitle}`.includes(search.trim()));

  return <View style={styles.screen}>
    <StatusBar style="light" />
    <LinearGradient colors={['#172D57', '#23477D', '#2D608E']} start={{ x: 0, y: 0.1 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
      <View pointerEvents="none" style={styles.orbitOne} /><View pointerEvents="none" style={styles.orbitTwo} />
      <View style={styles.headerTop}>
        <View style={styles.brand}><View style={styles.brandIcon}><Car size={19} color="#D3E9F8" strokeWidth={1.6} /></View><Text style={styles.brandName}>سەیارە</Text></View>
        {current?.is_terminal ? <Pressable onPress={location.open} accessibilityRole="button" accessibilityLabel="گۆڕینی شار" style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={{ fontFamily: font.medium, fontSize: 11, color: '#BED5EC' }}>{location.city}</Text><MapPin size={13} color="#BED5EC" /></Pressable> : <Text style={styles.brandEnglish}>SAYARA</Text>}
      </View>
      {!current?.is_terminal && <>
      <View style={styles.locationRow}>
        <Pressable onPress={location.open} style={({ pressed }) => [styles.locateButton, pressed && { opacity: 0.7 }]} accessibilityLabel="دیاریکردن یان گۆڕینی شوێن" accessibilityRole="button"><LocateFixed color="#D8E9FA" size={22} strokeWidth={1.6} /></Pressable>
        <Pressable onPress={location.open} style={styles.locationSelect} accessibilityRole="button" accessibilityLabel={`گۆڕینی شار، ${location.city}`}>
          <View style={styles.locationLabel}><Text style={styles.locationSmall}>لە نزیک تۆ</Text><MapPin size={12} color="#A6C4E1" /></View>
          <View style={styles.cityRow}><ChevronDown color="#B6D5ED" size={17} /><Text style={styles.city}>{location.city}</Text></View>
        </Pressable>
      </View>
      <View style={styles.searchBox}>
        {!!search ? <Pressable onPress={() => setSearch('')} style={styles.searchClear} accessibilityLabel="سڕینەوەی گەڕان" accessibilityRole="button"><X size={17} color={colors.muted} /></Pressable> : <View style={styles.searchAccent}><Layers size={19} color={colors.cyan} strokeWidth={1.6} /></View>}
        <TextInput value={search} onChangeText={setSearch} placeholder={root ? 'گەڕان لەم بەشەدا...' : 'بەدوای چی دەگەڕێیت؟'} placeholderTextColor="#8A9BAF" style={styles.searchInput} maxLength={100} returnKeyType="search" accessibilityLabel="گەڕان بەدوای بەشەکان" />
        <Search size={21} color="#839BB8" strokeWidth={1.7} />
      </View>
      </>}
    </LinearGradient>

    <Animated.View style={[styles.body, { opacity: transition, transform: [{ translateY: transition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      {!root ? <ScrollView contentContainerStyle={[styles.homeContent, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}><Text style={styles.eyebrow}>بۆ ئۆتۆمبێلەکەت</Text><Text style={styles.heading}>هەموو شتێک، لە یەک شوێن</Text><Text style={styles.introText}>بەشێک هەڵبژێرە و ئەوەی پێویستتە بدۆزەرەوە.</Text></View>
        {homeCards.map((item, index) => <Pressable key={item.key} onPress={() => navigate(item.key)} accessibilityRole="button" accessibilityLabel={item.name} style={({ pressed }) => [styles.catalogCard, item.key === 'accessories' && styles.accessoryCard, pressed && { transform: [{ scale: 0.985 }], opacity: 0.9 }]}>
          <View style={styles.cardArt}><CatalogArt accessory={item.key === 'accessories'} /></View>
          <View style={styles.cardCopy}><View style={[styles.cardTag, item.key === 'accessories' && { backgroundColor: '#EFE7D9' }]}><Text style={[styles.cardTagText, item.key === 'accessories' && { color: '#998160' }]}>{item.key === 'parts' ? 'پارچە و پێداویستی' : 'جوانی و ستایل'}</Text></View><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.cardDescription}>{item.subtitle}</Text><View style={styles.cardCta}><ArrowLeft color={item.key === 'parts' ? colors.blue : '#998160'} size={16} /><Text style={[styles.cardCtaText, item.key === 'accessories' && { color: '#998160' }]}>بینینی بەشەکان</Text></View></View>
        </Pressable>)}
        {!homeCards.length && <Text style={styles.noMatch}>هیچ بەشێک نەدۆزرایەوە.</Text>}
        <View style={styles.homeFoot}><View style={styles.footLine} /><View style={styles.footMark}><Check size={12} color="#97A6B8" /></View><Text style={styles.footText}>هەڵبژاردنێکی ئاسان بۆ ئۆتۆمبێلەکەت</Text><View style={styles.footLine} /></View>
      </ScrollView> : <>
        <View style={styles.pageHeading}><Pressable onPress={back} accessibilityRole="button" accessibilityLabel="گەڕانەوە" style={styles.backButton}><ArrowRight size={20} color={colors.ink} /></Pressable><View style={{ flex: 1 }}><Text style={styles.pageTitle}>{current?.name || rootInfo?.name}</Text><Text style={styles.pageSubtitle}>{current?.is_terminal ? 'کاڵای کۆتایی' : current?.description || 'بەشێک هەڵبژێرە بۆ بەردەوامبوون'}</Text></View></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll} contentContainerStyle={styles.breadcrumbs}>
          <Pressable onPress={() => navigate(null)} accessibilityRole="button"><Text style={styles.crumb}>سەرەکی</Text></Pressable><ChevronLeft size={12} color="#B4BECB" />
          <Pressable onPress={() => navigate(root)} accessibilityRole="button"><Text style={[styles.crumb, !trail.length && styles.activeCrumb]}>{rootInfo?.name}</Text></Pressable>
          {trail.map((section, index) => <View key={section.id} style={styles.crumbGroup}><ChevronLeft size={12} color="#B4BECB" /><Pressable onPress={() => navigate(root, trail.slice(0, index + 1))} accessibilityRole="button"><Text style={[styles.crumb, index === trail.length - 1 && styles.activeCrumb]}>{section.name}</Text></Pressable></View>)}
        </ScrollView>
        {current?.is_terminal ? <ProductDetail key={current.id} initial={current} onUpdate={section => setTrail(value => value.map(item => item.id === section.id ? section : item))} /> : (<FlatList key={`${root}:${current?.id || 'root'}`} data={catalog.sections} keyExtractor={item => item.id} contentContainerStyle={[styles.sectionList, { paddingBottom: insets.bottom + 24 }, !catalog.sections.length && { flexGrow: 1 }]} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={catalog.loading && catalog.sections.length > 0} onRefresh={catalog.refresh} tintColor={colors.blue} />} onEndReached={() => { if (catalog.hasMore && !catalog.loading && !catalog.error) void catalog.loadMore(); }} onEndReachedThreshold={0.3}
          renderItem={({ item }) => <Pressable onPress={() => navigate(root, [...trail, item])} style={({ pressed }) => [styles.sectionCard, pressed && { backgroundColor: '#EDF3FA' }]} accessibilityRole="button" accessibilityLabel={item.name}>
            <ChevronLeft size={19} color="#A7B5C6" /><View style={styles.sectionCopy}><Text style={styles.sectionName}>{item.name}</Text>{(item.is_terminal || !!item.description) && <Text style={styles.sectionDescription} numberOfLines={2}>{item.is_terminal ? [formatPrice(item.price_usd, "USD"), formatPrice(item.price_iqd, "IQD")].filter(Boolean).join(" · ") : item.description}</Text>}</View><View style={styles.sectionIcon}>{item.is_terminal && item.image_path ? <Image source={{ uri: imageUrl(process.env.EXPO_PUBLIC_SUPABASE_URL, item.image_path)! }} style={{ width: 48, height: 48, borderRadius: 14 }} resizeMode="contain" /> : <SectionGlyph name={item.icon} />}</View>
          </Pressable>}
          ListEmptyComponent={<View style={styles.empty}>
            {catalog.loading ? <ActivityIndicator size="large" color={colors.blue} /> : <><View style={styles.emptyIcon}><Folder size={34} strokeWidth={1.2} color="#8BA7C8" /></View><Text style={styles.emptyTitle}>{catalog.error ? 'پەیوەندییەکە سەرکەوتوو نەبوو' : search ? 'هیچ ئەنجامێک نەدۆزرایەوە' : 'هێشتا بەشێک زیاد نەکراوە'}</Text><Text style={styles.emptyDescription}>{catalog.error ? 'تکایە پەیوەندی ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدە.' : search ? 'بە ناوێکی دیکە بگەڕێ.' : 'بەشەکان لێرە دەردەکەون کاتێک بەردەست بن.'}</Text>{catalog.error && <Pressable style={styles.retry} onPress={catalog.refresh} accessibilityRole="button"><Text style={styles.retryText}>هەوڵدانەوە</Text></Pressable>}</>}
          </View>}
          ListFooterComponent={catalog.sections.length ? <View style={{ paddingVertical: 14 }}>{catalog.loading ? <ActivityIndicator color={colors.blue} /> : catalog.error ? <Pressable style={styles.retry} onPress={catalog.loadMore}><Text style={styles.retryText}>هەوڵدانەوە</Text></Pressable> : catalog.hasMore ? <Pressable style={styles.retry} onPress={catalog.loadMore}><Text style={styles.retryText}>بینینی زیاتر</Text></Pressable> : null}</View> : undefined}
        />)}
      </>}
    </Animated.View>
    <LocationSheet visible={location.visible} city={location.city} detecting={location.detecting} message={location.message} onClose={location.close} onDetect={location.detect} onSelect={location.select} />
  </View>;
}

export default function App() {
  const [loaded, error] = useFonts({ NotoSansArabic_400Regular, NotoSansArabic_500Medium, NotoSansArabic_700Bold });
  if (!loaded && !error) return <View style={styles.fontLoading}><ActivityIndicator color={colors.blue} /></View>;
  return <SafeAreaProvider><CustomerApp /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, direction: 'ltr' }, fontLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { paddingHorizontal: 24, paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  orbitOne: { position: 'absolute', right: -85, top: -125, width: 280, height: 280, borderWidth: 1, borderColor: '#FFFFFF0A', borderRadius: 140, backgroundColor: '#FFFFFF03' },
  orbitTwo: { position: 'absolute', left: -90, bottom: -160, width: 310, height: 310, borderRadius: 155, borderWidth: 1, borderColor: '#FFFFFF07' },
  headerTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }, brandIcon: { width: 29, height: 29, backgroundColor: '#FFFFFF0D', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: font.bold, color: 'white', fontSize: 14 }, brandEnglish: { fontSize: 10, color: '#A1BCDC', letterSpacing: 3, fontWeight: '600' },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 23, marginBottom: 22 },
  locateButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderColor: '#FFFFFF16', borderWidth: 1, backgroundColor: '#FFFFFF07' },
  locationSelect: { alignItems: 'flex-end', paddingLeft: 18 }, locationLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationSmall: { fontFamily: font.regular, fontSize: 10, color: '#A6C4E1' }, cityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, city: { fontFamily: font.bold, color: 'white', fontSize: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 19, paddingHorizontal: 14, minHeight: 58 },
  searchAccent: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF7FA' }, searchClear: { padding: 8 },
  searchInput: { flex: 1, minWidth: 0, fontFamily: font.regular, fontSize: 12, textAlign: 'right', color: colors.ink, paddingVertical: 12, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  body: { flex: 1 }, homeContent: { paddingHorizontal: 24, paddingTop: 30, maxWidth: 640, width: '100%', alignSelf: 'center' },
  intro: { alignItems: 'flex-end', marginBottom: 24 }, eyebrow: { fontFamily: font.medium, fontSize: 10, color: colors.cyan, marginBottom: 5 },
  heading: { fontFamily: font.bold, fontSize: 22, color: colors.ink, textAlign: 'right' }, introText: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: 4, textAlign: 'right', lineHeight: 24 },
  catalogCard: { backgroundColor: '#F0F5FC', borderColor: '#E3ECF7', borderWidth: 1, borderRadius: 24, minHeight: 174, marginBottom: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  accessoryCard: { backgroundColor: '#F8F5EF', borderColor: '#EDE7DB' }, cardArt: { width: '42%', alignItems: 'center' }, cardCopy: { flex: 1, alignItems: 'flex-end', paddingRight: 21, paddingVertical: 21 },
  cardTag: { backgroundColor: '#E1EBF8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }, cardTagText: { fontFamily: font.medium, fontSize: 9, color: '#567CAA' },
  cardTitle: { fontFamily: font.bold, fontSize: 24, color: colors.ink, marginTop: 4, textAlign: 'right' }, cardDescription: { fontFamily: font.regular, fontSize: 11, color: '#8492A3', textAlign: 'right', lineHeight: 22 },
  cardCta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, cardCtaText: { fontFamily: font.medium, fontSize: 11, color: colors.blue },
  homeFoot: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, footLine: { flex: 1, height: 1, backgroundColor: '#E6EBF2' }, footText: { fontFamily: font.regular, fontSize: 8, color: '#A5AFBC' }, footMark: { width: 16, height: 16, borderWidth: 1, borderColor: '#E0E6EF', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  noMatch: { fontFamily: font.regular, textAlign: 'center', color: colors.muted, padding: 25 },
  pageHeading: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 24 }, backButton: { width: 42, height: 42, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  pageTitle: { fontFamily: font.bold, fontSize: 22, color: colors.ink, textAlign: 'right' }, pageSubtitle: { fontFamily: font.regular, color: colors.muted, fontSize: 10, textAlign: 'right', lineHeight: 22 },
  breadcrumbScroll: { flexGrow: 0, maxHeight: 58, marginVertical: 10 }, breadcrumbs: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 8, paddingHorizontal: 24, flexGrow: 1, paddingVertical: 8 }, crumb: { fontFamily: font.regular, fontSize: 10, color: colors.muted }, activeCrumb: { color: colors.blue }, crumbGroup: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
  sectionList: { paddingHorizontal: 24 }, sectionCard: { backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, minHeight: 88 }, sectionIcon: { width: 48, height: 48, backgroundColor: '#EFF4FB', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, sectionCopy: { flex: 1 }, sectionName: { fontFamily: font.bold, fontSize: 15, color: colors.ink, textAlign: 'right' }, sectionDescription: { fontFamily: font.regular, fontSize: 10, color: colors.muted, textAlign: 'right', lineHeight: 22 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 70, minHeight: 250 }, emptyIcon: { height: 82, width: 82, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECF2F9', marginBottom: 16 }, emptyTitle: { fontFamily: font.bold, color: colors.ink, fontSize: 15, textAlign: 'center' }, emptyDescription: { fontFamily: font.regular, fontSize: 11, lineHeight: 25, color: colors.muted, textAlign: 'center', marginTop: 8, maxWidth: 300 }, retry: { paddingVertical: 10, paddingHorizontal: 22, backgroundColor: '#E9F0F9', borderRadius: 12, alignSelf: 'center', marginTop: 16 }, retryText: { fontFamily: font.medium, fontSize: 12, color: colors.blue },
});
