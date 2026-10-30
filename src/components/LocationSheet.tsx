import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronLeft, LocateFixed, MapPin, X } from 'lucide-react-native';
import { colors, font } from '../theme';

interface Props { visible: boolean; city: string; detecting: boolean; message: string; onClose: () => void; onDetect: () => void; onSelect: (city: string) => void }
const cities = ['هەولێر', 'سلێمانی', 'دهۆک', 'کەرکووک', 'هەڵەبجە', 'زاخۆ', 'سۆران', 'ڕانیە', 'کۆیە', 'چەمچەماڵ', 'بەغدا', 'مووسڵ'];

export function LocationSheet(props: Props) {
  const [query, setQuery] = useState('');
  const options = cities.filter(city => city.includes(query.trim()));
  return <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} accessibilityLabel="داخستن" />
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.handle} />
        <Pressable onPress={props.onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="داخستن"><X color={colors.muted} size={22} /></Pressable>
        <View style={styles.pin}><MapPin color={colors.cyan} size={27} /></View>
        <Text style={styles.title}>لە کوێیت؟</Text>
        <Text style={styles.subtitle}>شوێنەکەت دیاری بکە یان شارەکەت بە دەست هەڵبژێرە.</Text>
        <Pressable onPress={props.onDetect} disabled={props.detecting} style={styles.detect} accessibilityRole="button">
          {props.detecting ? <ActivityIndicator color="white" /> : <LocateFixed color="white" size={20} />}
          <Text style={styles.detectText}>{props.detecting ? 'شوێنەکەت دیاری دەکرێت...' : 'دیاریکردنی شوێنی ئێستا'}</Text>
        </Pressable>
        {!!props.message && <Text accessibilityLiveRegion="polite" style={styles.message}>{props.message}</Text>}
        <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>یان هەڵبژاردنی دەستی</Text><View style={styles.line} /></View>
        <TextInput value={query} onChangeText={setQuery} placeholder="ناوی شارەکەت..." placeholderTextColor={colors.muted} style={styles.input} maxLength={80} accessibilityLabel="گەڕان یان نووسینی ناوی شار" />
        <ScrollView style={{ maxHeight: 238 }} keyboardShouldPersistTaps="handled">
          {options.map(city => <Pressable key={city} style={styles.city} onPress={() => { props.onSelect(city); setQuery(''); }} accessibilityRole="button">
            {props.city === city ? <Check color={colors.cyan} size={20} /> : <ChevronLeft color="#BBC4D0" size={19} />}
            <Text style={[styles.cityText, props.city === city && { color: colors.cyan }]}>{city}</Text>
          </Pressable>)}
          {!!query.trim() && !cities.includes(query.trim()) && <Pressable style={styles.city} onPress={() => { props.onSelect(query); setQuery(''); }} accessibilityRole="button"><Check color={colors.cyan} size={20} /><Text style={styles.cityText}>هەڵبژاردنی «{query.trim()}»</Text></Pressable>}
        </ScrollView>
        <Pressable onPress={props.onClose} style={styles.later} accessibilityRole="button"><Text style={styles.laterText}>دواتر دیاری دەکەم</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0C1C3966', justifyContent: 'flex-end', alignItems: 'center', direction: 'ltr' },
  sheet: { width: '100%', maxWidth: 520, padding: 24, paddingBottom: 30, backgroundColor: colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  handle: { width: 36, height: 4, backgroundColor: '#E2E7ED', borderRadius: 4, alignSelf: 'center', marginTop: -10, marginBottom: 20 },
  close: { position: 'absolute', top: 28, left: 24, padding: 8 },
  pin: { alignSelf: 'center', width: 58, height: 58, borderRadius: 20, backgroundColor: '#EDF7FA', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: 24, textAlign: 'center', color: colors.ink, marginTop: 8 },
  subtitle: { fontFamily: font.regular, fontSize: 12, textAlign: 'center', color: colors.muted, lineHeight: 25, marginTop: 4, marginBottom: 20 },
  detect: { backgroundColor: colors.navy, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  detectText: { color: 'white', fontFamily: font.medium, fontSize: 13 },
  message: { fontFamily: font.regular, fontSize: 12, lineHeight: 25, textAlign: 'right', color: colors.cyan, paddingTop: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  line: { height: 1, backgroundColor: colors.line, flex: 1 },
  or: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
  input: { fontFamily: font.regular, fontSize: 14, textAlign: 'right', color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8 },
  city: { minHeight: 49, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#F3F5F8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityText: { fontFamily: font.medium, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  later: { alignItems: 'center', paddingTop: 18 },
  laterText: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
});
