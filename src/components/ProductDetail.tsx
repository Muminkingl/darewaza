import { CompatibilityCard } from "./CompatibilityCard";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Bookmark, ImageOff, Maximize2, X } from "./icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useSWR from "swr";
import { formatPrice, imageUrl, type Section } from "../../shared/catalog";
import { supabase, supabaseUrl } from "../lib/supabase";
import { useLanguage } from "../i18n";
import { useCustomer, useMembership } from "../providers/CustomerProvider";
import { colors, font } from "../theme";
import { Tap } from "./Motion";
export function ProductDetail({
  initial,
  onUpdate,
  onGarage,
}: {
  initial: Section;
  onUpdate: (section: Section) => void;
  onGarage: () => void;
}) {
  const { t, row, align } = useLanguage();
  const insets = useSafeAreaInsets();
  const { toggleSave, busy } = useCustomer();
  const has = useMembership([initial]);
  const [zoom, setZoom] = useState(false);
  const [fitRevision, setFitRevision] = useState(0);
  const [failed, setFailed] = useState("");
  const [saveError, setSaveError] = useState(false);
  const {
    data: section,
    error,
    isValidating,
    mutate,
  } = useSWR(
    ["product", initial.id],
    async () => {
      const { data, error } = await supabase!
        .from("catalog_sections")
        .select("*")
        .eq("id", initial.id)
        .maybeSingle();
      if (error) throw error;
      if (data) onUpdate(data as Section);
      return data as Section | null;
    },
    { fallbackData: initial },
  );
  const item = section || initial;
  const url = imageUrl(supabaseUrl, item.image_path);
  const saved = has(item.id);
  return (
    <>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={isValidating}
            onRefresh={() => {
              setFitRevision((n) => n + 1);
              void mutate();
            }}
            tintColor={colors.blue}
          />
        }
      >
        <View style={s.card}>
          <Pressable
            style={s.hero}
            onPress={() => {
              if (url && failed !== url) setZoom(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("enlarge")}
          >
            {url && failed !== url ? (
              <>
                <Image
                  source={{ uri: url }}
                  style={s.image}
                  resizeMode="contain"
                  accessibilityLabel={item.name}
                  onError={() => setFailed(url)}
                />
                <View style={s.expand}>
                  <Maximize2 size={17} color="#7898BA" />
                </View>
              </>
            ) : (
              <View style={s.noImage}>
                <ImageOff size={38} color="#A3B7CC" strokeWidth={1.2} />
                <Text style={s.noImageText}>{t("noImage")}</Text>
              </View>
            )}
          </Pressable>
          <View style={s.info}>
            <View style={[s.labelRow, row]}>
              <Text style={[s.label, align]}>{t("product")}</Text>
              <Tap
                disabled={busy.has(item.id)}
                accessibilityLabel={t(saved ? "unsave" : "save")}
                onPress={() => {
                  setSaveError(false);
                  void toggleSave(item, saved).catch(() => setSaveError(true));
                }}
                style={[s.save, saved && { backgroundColor: "#E4F3ED" }]}
              >
                <Bookmark
                  size={18}
                  fill={saved ? "#A9D9C7" : "none"}
                  color={saved ? "#418D7B" : colors.blue}
                />
                <Text style={[s.saveText, saved && { color: "#418D7B" }]}>
                  {t(saved ? "saved" : "save")}
                </Text>
              </Tap>
            </View>
            <Text style={[s.title, align]}>{item.name}</Text>
            {!!item.description && (
              <Text style={[s.description, align]}>{item.description}</Text>
            )}
            <View style={[s.prices, row]}>
              {item.price_usd != null && (
                <View style={s.price}>
                  <Text style={[s.priceLabel, align]}>{t("usdPrice")}</Text>
                  <Text style={[s.priceValue, align]}>
                    {formatPrice(item.price_usd, "USD")}
                  </Text>
                </View>
              )}
              {item.price_iqd != null && (
                <View style={s.price}>
                  <Text style={[s.priceLabel, align]}>{t("iqdPrice")}</Text>
                  <Text style={[s.priceValue, align]}>
                    {formatPrice(item.price_iqd, "IQD")}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[s.note, align]}>{t("pricesNote")}</Text>
          </View>
        </View>
        {section !== null && (
          <CompatibilityCard
            section={item.id}
            onManage={onGarage}
            revision={fitRevision}
          />
        )}
        {(!!error || saveError || section === null) && (
          <Text accessibilityLiveRegion="polite" style={s.error}>
            {t(
              section === null
                ? "unavailable"
                : saveError
                  ? "syncError"
                  : "networkError",
            )}
          </Text>
        )}
      </ScrollView>
      <Modal
        visible={zoom}
        transparent
        animationType="fade"
        onRequestClose={() => setZoom(false)}
      >
        <View
          style={[
            s.zoom,
            { paddingTop: insets.top + 65, paddingBottom: insets.bottom + 25 },
          ]}
        >
          <Pressable
            style={[s.close, { top: insets.top + 15 }]}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
            onPress={() => setZoom(false)}
          >
            <X size={25} color="#fff" />
          </Pressable>
          {url && (
            <Image
              source={{ uri: url }}
              style={s.zoomImage}
              resizeMode="contain"
              accessibilityLabel={item.name}
            />
          )}
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E3EAF2",
    borderRadius: 25,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  hero: {
    width: "100%",
    aspectRatio: 1.15,
    backgroundColor: "#F0F5FA",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  expand: {
    position: "absolute",
    left: 15,
    bottom: 15,
    backgroundColor: "#FFFFFFEE",
    borderRadius: 11,
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  noImage: { gap: 13, alignItems: "center" },
  noImageText: { fontFamily: font.regular, fontSize: 11, color: "#94A9C0" },
  info: { padding: 21 },
  labelRow: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  label: { fontFamily: font.medium, fontSize: 10, color: "#86A2BA" },
  save: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: "#EFF4FA",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveText: { fontFamily: font.medium, fontSize: 10, color: colors.blue },
  title: {
    fontFamily: font.bold,
    fontSize: 25,
    color: colors.ink,
    marginTop: 15,
  },
  description: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 27,
    color: colors.muted,
    marginTop: 7,
  },
  prices: { flexWrap: "wrap", gap: 12, marginTop: 24 },
  price: {
    flex: 1,
    minWidth: 115,
    backgroundColor: "#F4F8FC",
    borderColor: "#E8EEF5",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },
  priceLabel: { fontFamily: font.regular, fontSize: 10, color: "#8A9FB7" },
  priceValue: {
    fontFamily: font.bold,
    fontSize: 21,
    color: "#24456F",
    marginTop: 11,
  },
  note: {
    fontFamily: font.regular,
    fontSize: 9,
    lineHeight: 22,
    color: "#9AA8B8",
    marginTop: 18,
  },
  error: {
    fontFamily: font.regular,
    color: "#A7635A",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 25,
    marginTop: 18,
  },
  zoom: {
    flex: 1,
    backgroundColor: "#101E33FA",
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomImage: { flex: 1, width: "100%", height: "100%" },
  close: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    backgroundColor: "#FFFFFF16",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
