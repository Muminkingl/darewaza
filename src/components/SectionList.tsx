import { memo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Car,
  Disc3,
  Folder,
  Package,
  Search,
  Settings,
  Sparkles,
  Wrench,
  Zap,
} from "./icons";
import type { Section, SectionIcon } from "../../shared/catalog";
import { formatPrice, imageUrl, sectionName } from "../../shared/catalog";
import { supabaseUrl } from "../lib/supabase";
import { useLanguage } from "../i18n";
import { useCustomer, useMembership } from "../providers/CustomerProvider";
import { colors, font } from "../theme";
import { Tap } from "./Motion";
const icons = {
  folder: Folder,
  car: Car,
  settings: Settings,
  wrench: Wrench,
  disc: Disc3,
  sparkles: Sparkles,
  package: Package,
  zap: Zap,
};
export function SectionGlyph({
  name,
  size = 25,
}: {
  name: SectionIcon;
  size?: number;
}) {
  const Icon = icons[name] || Folder;
  return <Icon size={size} color={colors.blue} strokeWidth={1.6} />;
}
export function EmptyState({
  title,
  hint,
  error = false,
  onRetry,
  search = false,
}: {
  title: string;
  hint: string;
  error?: boolean;
  onRetry?: () => void;
  search?: boolean;
}) {
  const { t } = useLanguage();
  const Icon = search ? Search : Package;
  return (
    <View style={s.empty}>
      <View style={s.emptyCircle}>
        <Icon color="#809EBB" size={34} strokeWidth={1.2} />
        <View style={s.emptyDot} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyHint}>{hint}</Text>
      {error && (
        <Tap onPress={onRetry} style={s.retry}>
          <Text style={s.retryText}>{t("retry")}</Text>
        </Tap>
      )}
    </View>
  );
}
const SectionRow = memo(function SectionRow({
  section,
  saved,
  onOpen,
  onSave,
  busy,
}: {
  section: Section;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const { t, row, align, rtl, locale } = useLanguage();
  const [failed, setFailed] = useState(false);
  const url = imageUrl(supabaseUrl, section.image_path);
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <View style={[s.card, row]}>
      <Pressable
        onPress={onOpen}
        style={[s.main, row]}
        accessibilityRole="button"
        accessibilityLabel={sectionName(section, locale)}
      >
        <View style={s.thumb}>
          {url && !failed ? (
            <Image
              source={{ uri: url }}
              resizeMode="contain"
              style={s.image}
              onError={() => setFailed(true)}
            />
          ) : (
            <SectionGlyph name={section.icon} />
          )}
        </View>
        <View style={s.copy}>
          <Text style={[s.name, align]} numberOfLines={2}>
            {sectionName(section, locale)}
          </Text>
          <Text style={[s.subtitle, align]} numberOfLines={1}>
            {section.is_terminal
              ? [
                  formatPrice(section.price_usd, "USD"),
                  formatPrice(section.price_iqd, "IQD"),
                ]
                  .filter(Boolean)
                  .join(" · ")
              : section.description || t("browse")}
          </Text>
        </View>
        <Arrow color="#A3B4C7" size={17} />
      </Pressable>
      <Pressable
        onPress={onSave}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t(saved ? "unsave" : "save")}
        accessibilityState={{ selected: saved, disabled: busy }}
        hitSlop={4}
        style={s.bookmark}
      >
        <Bookmark
          size={20}
          color={saved ? colors.blue : "#AAB7C7"}
          fill={saved ? "#DAE8F5" : "none"}
          strokeWidth={1.6}
        />
      </Pressable>
    </View>
  );
});
export type ListData = {
  sections: Section[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  refresh: () => unknown;
  loadMore: () => unknown;
};
export function SectionList({
  data,
  onOpen,
  emptyTitle,
  emptyHint,
  header,
  search = false,
  knownSaved = false,
}: {
  data: ListData;
  onOpen: (section: Section) => void;
  emptyTitle: string;
  emptyHint: string;
  header?: React.ReactElement;
  search?: boolean;
  knownSaved?: boolean;
}) {
  const { t } = useLanguage();
  const { toggleSave, busy } = useCustomer();
  const has = useMembership(data.sections);
  const [saveError, setSaveError] = useState(false);
  return (
    <FlatList
      data={data.sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[s.list, !data.sections.length && { flexGrow: 1 }]}
      ListHeaderComponent={
        <>
          {header}
          {saveError && (
            <Text accessibilityLiveRegion="polite" style={s.error}>
              {t("syncError")}
            </Text>
          )}
        </>
      }
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={data.loading && data.sections.length > 0}
          onRefresh={() => void data.refresh()}
          tintColor={colors.blue}
        />
      }
      onEndReached={() => {
        if (data.hasMore && !data.loading && !data.error) void data.loadMore();
      }}
      onEndReachedThreshold={0.25}
      initialNumToRender={12}
      maxToRenderPerBatch={10}
      windowSize={7}
      renderItem={({ item }) => (
        <SectionRow
          section={item}
          saved={knownSaved || has(item.id)}
          busy={busy.has(item.id)}
          onOpen={() => onOpen(item)}
          onSave={() => {
            setSaveError(false);
            void toggleSave(item, knownSaved || has(item.id))
              .then(() => {
                // Revalidate the mounted paginated collection after a removal.
                // Its bound mutate also refreshes the individual page caches.
                if (knownSaved) return data.refresh();
              })
              .catch(() => setSaveError(true));
          }}
        />
      )}
      ListEmptyComponent={
        data.loading ? (
          <View style={s.loading}>
            <ActivityIndicator color={colors.blue} />
          </View>
        ) : (
          <EmptyState
            search={search}
            title={data.error ? t("networkError") : emptyTitle}
            hint={data.error ? t("syncError") : emptyHint}
            error={data.error}
            onRetry={() => void data.refresh()}
          />
        )
      }
      ListFooterComponent={
        data.sections.length ? (
          <View style={s.footer}>
            {data.loading ? (
              <ActivityIndicator color={colors.blue} />
            ) : data.hasMore || data.error ? (
              <Tap
                onPress={() =>
                  void (data.error ? data.refresh() : data.loadMore())
                }
                style={s.retry}
              >
                <Text style={s.retryText}>
                  {t(data.error ? "retry" : "loadMore")}
                </Text>
              </Tap>
            ) : null}
          </View>
        ) : undefined
      }
    />
  );
}
const s = StyleSheet.create({
  list: {
    paddingHorizontal: 22,
    paddingBottom: 20,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7ECF2",
    backgroundColor: "#fff",
    alignItems: "center",
    padding: 12,
    marginBottom: 11,
    gap: 2,
  },
  main: { flex: 1, alignItems: "center", gap: 13, minHeight: 62 },
  thumb: {
    width: 58,
    height: 58,
    backgroundColor: "#F0F5FA",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  copy: { flex: 1, minWidth: 0 },
  name: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 10,
    color: "#8798AD",
    lineHeight: 23,
    marginTop: 3,
  },
  bookmark: {
    width: 40,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    minHeight: 240,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    width: 90,
    height: 90,
    borderRadius: 32,
    backgroundColor: "#EDF3F8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#8FD3C1",
    borderWidth: 3,
    borderColor: colors.background,
    position: "absolute",
    right: 5,
    top: 8,
  },
  emptyTitle: {
    fontFamily: font.bold,
    fontSize: 17,
    textAlign: "center",
    color: colors.ink,
  },
  emptyHint: {
    fontFamily: font.regular,
    fontSize: 11,
    textAlign: "center",
    color: colors.muted,
    lineHeight: 25,
    maxWidth: 300,
    marginTop: 7,
  },
  retry: {
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 13,
    backgroundColor: "#E9F0F8",
    marginTop: 12,
  },
  retryText: { fontFamily: font.medium, fontSize: 12, color: colors.blue },
  loading: { padding: 70 },
  footer: { paddingVertical: 16 },
  error: {
    fontFamily: font.regular,
    fontSize: 11,
    textAlign: "center",
    color: "#AD6358",
    padding: 10,
  },
});
