import { GarageSheet } from "./components/GarageSheet";
import { VehicleCatalogScreen } from "./screens/VehicleCatalogScreen";
import { useEffect, useState } from "react";
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  House,
  LocateFixed,
  Search,
  UserRound,
  X,
} from "./components/icons";
import { Brand } from "./components/Brand";
import { FadeIn, Tap } from "./components/Motion";
import { useLanguage } from "./i18n";
import { useLocation } from "./hooks/useLocation";
import { useCatalog } from "./hooks/useCatalog";
import { HomeScreen } from "./screens/HomeScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { CollectionScreen } from "./screens/CollectionScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SectionList } from "./components/SectionList";
import { ProductDetail } from "./components/ProductDetail";
import { LocationSheet } from "./components/LocationSheet";
import { colors, font } from "./theme";
import { sectionName, type RootKey, type Section } from "../shared/catalog";
type Tab = "home" | "search" | "saved" | "profile" | "vehicle";
type Route = { root: RootKey; trail: Section[] };
const tabs = [
  { key: "saved", icon: Bookmark },
  { key: "home", icon: House },
  { key: "profile", icon: UserRound },
] as const;
function CatalogScreen({
  route,
  onOpen,
  onBack,
  onCrumb,
  onUpdate,
  onGarage,
}: {
  route: Route;
  onOpen: (s: Section) => void;
  onBack: () => void;
  onCrumb: (trail: Section[]) => void;
  onUpdate: (s: Section) => void;
  onGarage: () => void;
}) {
  const { t, row, align, rtl, locale } = useLanguage();
  const [search, setSearch] = useState("");
  const current = route.trail.at(-1);
  const data = useCatalog(
    current?.is_terminal ? null : route.root,
    current?.id || null,
    search,
  );
  const Arrow = rtl ? ArrowRight : ArrowLeft;
  const Chevron = rtl ? ChevronLeft : ChevronRight;
  return (
    <View style={{ flex: 1 }}>
      <View style={[s.pageHeading, row]}>
        <Tap onPress={onBack} accessibilityLabel={t("back")} style={s.back}>
          <Arrow size={20} color={colors.ink} />
        </Tap>
        <View style={{ flex: 1 }}>
          <Text style={[s.pageTitle, align]}>
            {current ? sectionName(current, locale) : t(route.root)}
          </Text>
          <Text style={[s.pageSubtitle, align]}>
            {current?.is_terminal
              ? t("product")
              : current?.description || t("browse")}
          </Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.crumbScroll}
        contentContainerStyle={[s.crumbs, row]}
      >
        <Pressable onPress={() => onCrumb([])} accessibilityRole="button">
          <Text style={s.crumb}>{t(route.root)}</Text>
        </Pressable>
        {route.trail.map((item, index) => (
          <View key={item.id} style={[s.crumbGroup, row]}>
            <Chevron size={12} color="#BCC9D6" />
            <Pressable
              onPress={() => onCrumb(route.trail.slice(0, index + 1))}
              accessibilityRole="button"
            >
              <Text
                style={[
                  s.crumb,
                  index === route.trail.length - 1 && s.currentCrumb,
                ]}
              >
                {sectionName(item, locale)}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {current?.is_terminal ? (
        <ProductDetail
          key={current.id}
          initial={current}
          onUpdate={onUpdate}
          onGarage={onGarage}
        />
      ) : (
        <SectionList
          data={data}
          onOpen={onOpen}
          emptyTitle={t(search ? "noResults" : "empty")}
          emptyHint={t(search ? "noResultsHint" : "emptyHint")}
          header={
            <View style={[s.sectionSearch, row]}>
              <Search size={18} color="#93A8BD" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                maxLength={100}
                placeholder={t("searchPlaceholder")}
                placeholderTextColor="#99AABD"
                accessibilityLabel={t("search")}
                style={[s.sectionInput, align]}
              />
              {!!search && (
                <Pressable
                  onPress={() => setSearch("")}
                  accessibilityRole="button"
                  accessibilityLabel={t("close")}
                  hitSlop={10}
                >
                  <X size={17} color="#93A8BD" />
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}
export function AppShell() {
  const { t, row, rtl } = useLanguage();
  const insets = useSafeAreaInsets();
  const [deleteRequested] = useState(() => {
    if (Platform.OS !== "web") return false;
    const requested =
      new URLSearchParams(window.location.search).get("action") ===
        "delete-account" ||
      window.sessionStorage.getItem("darewaza.deleteRequested") === "1";
    window.sessionStorage.removeItem("darewaza.deleteRequested");
    return requested;
  });
  const location = useLocation(!deleteRequested);
  const [tab, setTab] = useState<Tab>(deleteRequested ? "profile" : "home");
  const [routes, setRoutes] = useState<Route[]>([]);
  const route = routes.at(-1);
  const [garageOpen, setGarageOpen] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => setKeyboard(true));
    const b = Keyboard.addListener("keyboardDidHide", () => setKeyboard(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  useEffect(() => {
    const l = BackHandler.addEventListener("hardwareBackPress", () => {
      if (location.visible) {
        location.close();
        return true;
      }
      if (routes.length) {
        setRoutes((previous) => previous.slice(0, -1));
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => l.remove();
  }, [routes.length, tab, location.visible, location.close]);
  function navigateTab(next: Tab) {
    Keyboard.dismiss();
    setRoutes([]);
    setTab(next);
  }
  function open(item: Section) {
    Keyboard.dismiss();
    setRoutes((previous) => [
      ...previous,
      {
        root: item.root_key,
        trail: route?.root === item.root_key ? [...route.trail, item] : [item],
      },
    ]);
  }
  const compact = tab !== "home" || !!route;
  const activeTab = tab === "vehicle" ? "home" : tab;
  return (
    <View style={s.screen}>
      <LinearGradient
        colors={["#172D57", "#244C72"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          s.header,
          { paddingTop: insets.top + 17 },
          compact && s.compactHeader,
        ]}
      >
        <View style={s.orbit} />
        <View style={[s.top, row]}>
          <Brand light small={compact} />
          <Tap
            onPress={() => navigateTab("search")}
            accessibilityLabel={t("search")}
            accessibilityState={{ selected: tab === "search" }}
            style={[s.searchButton, tab === "search" && s.searchButtonActive]}
          >
            <Search
              size={21}
              color={tab === "search" ? colors.navy : "#D3E5F2"}
              strokeWidth={1.6}
            />
          </Tap>
        </View>
        {!compact && (
          <View style={[s.homeHeader, row]}>
            <View>
              <Text
                style={[s.locationLabel, { textAlign: rtl ? "right" : "left" }]}
              >
                {t("nearby")}
              </Text>
              <Tap onPress={location.open} style={[s.locationCity, row]}>
                <Text style={s.city}>{location.city}</Text>
                <ChevronDown size={17} color="#A5C4DD" />
              </Tap>
            </View>
            <Tap
              style={s.locate}
              onPress={() => void location.detect()}
              accessibilityLabel={t("detect")}
            >
              <LocateFixed size={22} color="#D1E8F2" strokeWidth={1.5} />
            </Tap>
          </View>
        )}
      </LinearGradient>
      <FadeIn
        change={`${tab}:${route?.root || ""}:${route?.trail.at(-1)?.id || ""}`}
        style={{ flex: 1 }}
      >
        {route ? (
          <CatalogScreen
            key={`${route.root}:${route.trail.at(-1)?.id || ""}`}
            route={route}
            onGarage={() => setGarageOpen(true)}
            onOpen={open}
            onBack={() => setRoutes((previous) => previous.slice(0, -1))}
            onCrumb={(trail) =>
              setRoutes((previous) => [
                ...previous,
                { root: route.root, trail },
              ])
            }
            onUpdate={(section) =>
              setRoutes((previous) =>
                previous.map((r) => ({
                  ...r,
                  trail: r.trail.map((item) =>
                    item.id === section.id ? section : item,
                  ),
                })),
              )
            }
          />
        ) : tab === "home" ? (
          <HomeScreen
            onGarage={() => setGarageOpen(true)}
            onVehicle={() => navigateTab("vehicle")}
            onRoot={(root) => setRoutes([{ root, trail: [] }])}
            onSaved={() => navigateTab("saved")}
          />
        ) : tab === "search" ? (
          <SearchScreen onOpen={open} onGarage={() => setGarageOpen(true)} />
        ) : tab === "vehicle" ? (
          <VehicleCatalogScreen
            onOpen={open}
            onManage={() => setGarageOpen(true)}
            onAll={() => navigateTab("home")}
          />
        ) : tab === "saved" ? (
          <CollectionScreen onOpen={open} />
        ) : (
          <ProfileScreen
            city={location.city}
            onGarage={() => setGarageOpen(true)}
            onLocation={location.open}
            onSaved={() => navigateTab("saved")}
            deleteRequested={deleteRequested}
          />
        )}
      </FadeIn>
      {!keyboard && (
        <View
          style={[s.navOuter, { paddingBottom: Math.max(insets.bottom, 10) }]}
        >
          <View style={[s.nav, row]}>
            {tabs.map(({ key, icon: Icon }) => (
              <Pressable
                key={key}
                onPress={() => navigateTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === key }}
                accessibilityLabel={t(key)}
                style={s.navItem}
              >
                <View
                  style={[
                    s.navIcon,
                    activeTab === key && s.navIconActive,
                    key === "home" && s.homeNavIcon,
                    key === "home" &&
                      activeTab === "home" &&
                      s.homeNavIconActive,
                  ]}
                >
                  <Icon
                    size={21}
                    color={
                      key === "home" && activeTab === "home"
                        ? "#FFFFFF"
                        : activeTab === key
                          ? colors.navy
                          : "#8192A6"
                    }
                    strokeWidth={activeTab === key ? 2 : 1.6}
                  />
                  {activeTab === key && key !== "home" && (
                    <View style={s.navDot} />
                  )}
                </View>
                <Text style={[s.navText, activeTab === key && s.navTextActive]}>
                  {t(key)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {garageOpen && <GarageSheet onClose={() => setGarageOpen(false)} />}
      <LocationSheet
        visible={location.visible}
        city={location.city}
        detecting={location.detecting}
        message={location.message}
        onClose={location.close}
        onDetect={location.detect}
        onSelect={location.select}
      />
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, direction: "ltr" },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  compactHeader: {
    paddingBottom: 18,
    borderBottomLeftRadius: 23,
    borderBottomRightRadius: 23,
  },
  orbit: {
    position: "absolute",
    right: -100,
    top: -160,
    width: 320,
    height: 320,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: "#FFFFFF09",
    backgroundColor: "#FFFFFF02",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  searchButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF07",
    borderWidth: 1,
    borderColor: "#FFFFFF18",
  },
  searchButtonActive: { backgroundColor: "#BCE6DB", borderColor: "#BCE6DB" },
  homeHeader: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 30,
  },
  locationLabel: {
    fontFamily: font.regular,
    fontSize: 9,
    color: "#A9C7DA",
    marginBottom: 5,
  },
  locationCity: { alignItems: "center", gap: 10 },
  city: { fontFamily: font.bold, fontSize: 24, color: "#fff" },
  locate: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#FFFFFF08",
    borderWidth: 1,
    borderColor: "#FFFFFF14",
    alignItems: "center",
    justifyContent: "center",
  },
  navOuter: {
    paddingTop: 9,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFFF5",
    borderTopWidth: 1,
    borderColor: "#E9EEF3",
  },
  nav: {
    maxWidth: 650,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    gap: 3,
  },
  navIcon: {
    width: 51,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconActive: { backgroundColor: "#EAF2F7" },
  homeNavIcon: {
    width: 58,
    height: 39,
    borderRadius: 15,
    backgroundColor: "#EEF3F8",
  },
  homeNavIconActive: { backgroundColor: colors.navy },
  navDot: {
    position: "absolute",
    right: 8,
    top: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#73BEAB",
  },
  navText: {
    fontFamily: font.regular,
    fontSize: 10,
    color: "#65768B",
    lineHeight: 20,
  },
  navTextActive: { fontFamily: font.bold, color: colors.navy },
  pageHeading: {
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  back: {
    width: 43,
    height: 43,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: { fontFamily: font.bold, fontSize: 23, color: colors.ink },
  pageSubtitle: {
    fontFamily: font.regular,
    fontSize: 10,
    color: colors.muted,
    lineHeight: 23,
  },
  crumbScroll: { height: 44, flexGrow: 0, flexShrink: 0, marginVertical: 6 },
  crumbs: { paddingHorizontal: 22, gap: 7, alignItems: "center", flexGrow: 1 },
  crumb: {
    fontFamily: font.regular,
    fontSize: 10,
    lineHeight: 22,
    color: "#92A4B8",
    paddingVertical: 5,
  },
  crumbGroup: { alignItems: "center", gap: 7 },
  currentCrumb: { color: colors.blue },
  sectionSearch: {
    minHeight: 52,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 10,
    marginBottom: 17,
  },
  sectionInput: {
    fontFamily: font.regular,
    fontSize: 12,
    color: colors.ink,
    flex: 1,
    paddingVertical: 12,
    minWidth: 0,
  },
});
