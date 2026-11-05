import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { randomUUID } from "expo-crypto";
import useSWRInfinite from "swr/infinite";
import useSWR from "swr";
import {
  Car,
  Check,
  Pencil,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Search,
} from "./icons";
import { useLanguage } from "../i18n";
import {
  useGarage,
  useMyVehicles,
  type VehicleDraft,
} from "../providers/GarageProvider";
import {
  vehicleName,
  type MyVehicle,
  type VehicleModel,
} from "../../shared/vehicles";
import { normalizePrice } from "../../shared/catalog";
import { supabase } from "../lib/supabase";
import { colors, font } from "../theme";
import { Tap, useReducedMotion } from "./Motion";

export function GarageSheet({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion();
  const { t, row, align, rtl } = useLanguage();
  const insets = useSafeAreaInsets();
  const garage = useGarage();
  const cars = useMyVehicles();
  const [view, setView] = useState<"list" | "edit" | "models" | "delete">(
    "list",
  );
  const [draft, setDraft] = useState<VehicleDraft | null>(null);
  const [model, setModel] = useState<VehicleModel | null>(null);
  const [year, setYear] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const guard = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const models = useSWRInfinite(
    (index, prev) =>
      view !== "models" || (prev && !prev.more)
        ? null
        : [
            "vehicle-models",
            query,
            index,
            prev?.last?.make ?? null,
            prev?.last?.model ?? null,
            prev?.last?.id ?? null,
          ],
    async (key) => {
      const { data, error } = await supabase!.rpc("find_vehicle_models", {
        query_text: query,
        after_make: key[3],
        after_model: key[4],
        after_id: key[5],
      });
      if (error) throw error;
      const items = ((data || []) as VehicleModel[]).slice(0, 40);
      return { items, last: items.at(-1), more: data.length > 40 };
    },
    { revalidateFirstPage: false, revalidateIfStale: false },
  );
  const options = useSWR(
    view === "edit" && model && Number(normalizePrice(year)) >= 1900
      ? ["vehicle-options", model.id, normalizePrice(year)]
      : null,
    async () => {
      const { data, error } = await supabase!.rpc("vehicle_detail_options", {
        model_uuid: model!.id,
        model_year: Number(normalizePrice(year)),
      });
      if (error) throw error;
      return data as { engine: string; trim: string }[];
    },
  );
  const Arrow = rtl ? ArrowRight : ArrowLeft;
  function edit(v?: MyVehicle) {
    setDraft(
      v
        ? { ...v }
        : {
            id: randomUUID(),
            model_id: "",
            year: 0,
            engine: "",
            trim: "",
            nickname: "",
          },
    );
    setModel(v?.model || null);
    setYear(v ? String(v.year) : "");
    setError("");
    setView("edit");
  }
  async function run(action: () => Promise<void>, close = false) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      if (close) onClose();
      else setView("list");
    } catch (e) {
      setError(
        t(
          (e as { code?: string }).code === "40001" ||
            (e as Error).message === "conflict"
            ? "carConflict"
            : "carError",
        ),
      );
    } finally {
      setBusy(false);
      guard.current = false;
    }
  }
  const title =
    view === "list"
      ? t("myCars")
      : view === "models"
        ? t("chooseModel")
        : view === "delete"
          ? t("removeCar")
          : t(draft?.version ? "editCar" : "addCar");
  return (
    <Modal
      visible
      transparent
      animationType={reduced ? "none" : "slide"}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel={t("close")}
          disabled={busy}
          onPress={onClose}
        />
        <View
          style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          accessibilityViewIsModal
        >
          <View style={s.handle} />
          <View style={[s.heading, row]}>
            {view !== "list" && (
              <Tap
                onPress={() => {
                  setError("");
                  setView(
                    view === "models" || view === "delete" ? "edit" : "list",
                  );
                }}
                disabled={busy}
                accessibilityLabel={t("back")}
                style={s.icon}
              >
                <Arrow size={21} color={colors.navy} />
              </Tap>
            )}
            <Text style={[s.title, align, { flex: 1 }]}>{title}</Text>
            <Tap
              onPress={onClose}
              disabled={busy}
              accessibilityLabel={t("close")}
              style={s.icon}
            >
              <X size={21} color={colors.muted} />
            </Tap>
          </View>
          {!!error && (
            <Text accessibilityLiveRegion="polite" style={s.error}>
              {error}
            </Text>
          )}
          {view === "list" ? (
            <FlatList
              data={cars.items}
              keyExtractor={(v) => v.id}
              keyboardShouldPersistTaps="handled"
              style={s.list}
              ListHeaderComponent={
                <>
                  <Text style={[s.hint, align]}>{t("carIntro")}</Text>
                  <Tap
                    disabled={busy}
                    onPress={() => void run(() => garage.select(null), true)}
                    style={[s.car, row, !garage.selected && s.selected]}
                  >
                    <Car size={22} color={colors.blue} />
                    <Text style={[s.name, align, { flex: 1 }]}>
                      {t("allVehicles")}
                    </Text>
                    {!garage.selected && <Check size={18} color="#548D7D" />}
                  </Tap>
                </>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    s.car,
                    row,
                    item.id === garage.selected?.id && s.selected,
                  ]}
                >
                  <Tap
                    disabled={busy}
                    style={[row, { flex: 1, alignItems: "center", gap: 12 }]}
                    onPress={() => void run(() => garage.select(item), true)}
                  >
                    <Car size={23} color={colors.blue} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.name, align]}>{vehicleName(item)}</Text>
                      <Text style={[s.hint, align]}>
                        {[item.nickname, item.engine, item.trim]
                          .filter(Boolean)
                          .join(" · ") || t("myCar")}
                      </Text>
                    </View>
                    {item.id === garage.selected?.id && (
                      <Check size={18} color="#548D7D" />
                    )}
                  </Tap>
                  <Tap
                    disabled={busy}
                    onPress={() => edit(item)}
                    accessibilityLabel={`${t("editCar")} ${vehicleName(item)}`}
                    style={s.icon}
                  >
                    <Pencil size={17} color={colors.blue} />
                  </Tap>
                </View>
              )}
              ListEmptyComponent={
                cars.loading ? (
                  <ActivityIndicator color={colors.blue} />
                ) : (
                  <Text style={[s.hint, align]}>{t("noCars")}</Text>
                )
              }
              ListFooterComponent={
                <>
                  {cars.error && (
                    <Tap onPress={() => void cars.refresh()}>
                      <Text style={s.error}>
                        {t("syncError")} · {t("retry")}
                      </Text>
                    </Tap>
                  )}
                  {cars.more && (
                    <Tap
                      disabled={cars.loading}
                      onPress={() => void cars.loadMore()}
                    >
                      <Text style={s.link}>{t("loadMore")}</Text>
                    </Tap>
                  )}
                  <Tap
                    disabled={busy}
                    onPress={() => edit()}
                    style={[s.primary, row]}
                  >
                    <Plus size={19} color="#fff" />
                    <Text style={s.primaryText}>{t("addCar")}</Text>
                  </Tap>
                </>
              }
            />
          ) : view === "models" ? (
            <>
              <View style={[s.inputRow, row]}>
                <Search size={19} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  style={[s.searchInput, align]}
                  placeholder={t("searchModels")}
                  accessibilityLabel={t("searchModels")}
                  maxLength={100}
                />
              </View>
              <FlatList
                data={models.data?.flatMap((p) => p.items) || []}
                keyExtractor={(m) => m.id}
                keyboardShouldPersistTaps="handled"
                style={s.list}
                renderItem={({ item }) => (
                  <Tap
                    style={[s.car, row]}
                    onPress={() => {
                      setModel(item);
                      setDraft((v) => (v ? { ...v, model_id: item.id } : v));
                      setView("edit");
                    }}
                  >
                    <Car size={20} color={colors.blue} />
                    <Text style={[s.name, align, { flex: 1 }]}>
                      {item.make} {item.model}
                    </Text>
                    {model?.id === item.id && (
                      <Check size={18} color={colors.blue} />
                    )}
                  </Tap>
                )}
                ListEmptyComponent={
                  models.isLoading ? (
                    <ActivityIndicator color={colors.blue} />
                  ) : (
                    <View>
                      <Text style={[s.name, align]}>
                        {t(query ? "noResults" : "noModels")}
                      </Text>
                      <Text style={[s.hint, align]}>{t("noModelsHint")}</Text>
                    </View>
                  )
                }
                ListFooterComponent={
                  <>
                    {models.error && (
                      <Tap onPress={() => void models.mutate()}>
                        <Text style={s.error}>
                          {t("networkError")} · {t("retry")}
                        </Text>
                      </Tap>
                    )}
                    {models.data?.at(-1)?.more && (
                      <Tap
                        disabled={models.isValidating}
                        onPress={() => void models.setSize((n) => n + 1)}
                      >
                        <Text style={s.link}>{t("loadMore")}</Text>
                      </Tap>
                    )}
                  </>
                }
              />
            </>
          ) : view === "delete" ? (
            <>
              <Text style={[s.hint, align]}>{t("removeCarBody")}</Text>
              <Tap
                style={[s.primary, { backgroundColor: "#AD655C" }]}
                disabled={busy}
                onPress={() =>
                  void run(() =>
                    garage.remove(cars.items.find((v) => v.id === draft!.id)!),
                  )
                }
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.primaryText}>{t("removeCar")}</Text>
                )}
              </Tap>
            </>
          ) : (
            draft && (
              <ScrollView keyboardShouldPersistTaps="handled" style={s.list}>
                <Text style={[s.label, align]}>{t("modelLabel")}</Text>
                <Tap
                  style={[s.inputRow, row]}
                  disabled={busy}
                  onPress={() => {
                    setSearch("");
                    setView("models");
                  }}
                >
                  <Car size={21} color={colors.blue} />
                  <Text style={[s.name, align, { flex: 1 }]}>
                    {model ? `${model.make} ${model.model}` : t("chooseModel")}
                  </Text>
                </Tap>
                <Text style={[s.label, align]}>{t("yearLabel")}</Text>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  editable={!busy}
                  placeholder="2024"
                  accessibilityLabel={t("yearLabel")}
                  style={[s.input, align]}
                />
                {(["engine", "trim", "nickname"] as const).map((key) => (
                  <View key={key}>
                    <Text style={[s.label, align]}>
                      {t(
                        key === "engine"
                          ? "engineLabel"
                          : key === "trim"
                            ? "trimLabel"
                            : "nicknameLabel",
                      )}{" "}
                      · {t("optional")}
                    </Text>
                    <TextInput
                      value={draft[key]}
                      onChangeText={(value) =>
                        setDraft({ ...draft, [key]: value })
                      }
                      maxLength={key === "nickname" ? 60 : 80}
                      editable={!busy}
                      accessibilityLabel={t(
                        key === "engine"
                          ? "engineLabel"
                          : key === "trim"
                            ? "trimLabel"
                            : "nicknameLabel",
                      )}
                      style={[s.input, align]}
                    />
                    {key !== "nickname" && (
                      <View
                        style={[
                          row,
                          { flexWrap: "wrap", gap: 7, marginTop: 7 },
                        ]}
                      >
                        {[
                          ...new Set(
                            (options.data || [])
                              .map((o) => o[key])
                              .filter(Boolean),
                          ),
                        ].map((value) => (
                          <Tap
                            key={value}
                            disabled={busy}
                            onPress={() => setDraft({ ...draft, [key]: value })}
                            style={{
                              padding: 9,
                              borderRadius: 10,
                              backgroundColor: "#EDF3F7",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: font.medium,
                                fontSize: 10,
                                color: colors.blue,
                              }}
                            >
                              {value}
                            </Text>
                          </Tap>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
                <Tap
                  style={s.primary}
                  disabled={busy || !model}
                  onPress={() => {
                    const value = Number(normalizePrice(year));
                    if (
                      !Number.isInteger(value) ||
                      value < 1900 ||
                      value > 2100
                    ) {
                      setError(t("yearError"));
                      return;
                    }
                    void run(() => garage.save({ ...draft, year: value }));
                  }}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.primaryText}>{t("saveChanges")}</Text>
                  )}
                </Tap>
                {draft.version && (
                  <Tap
                    disabled={busy}
                    onPress={() => setView("delete")}
                    style={[s.remove, row]}
                  >
                    <Trash2 size={16} color="#AE695F" />
                    <Text
                      style={{
                        fontFamily: font.medium,
                        color: "#AE695F",
                        fontSize: 12,
                      }}
                    >
                      {t("removeCar")}
                    </Text>
                  </Tap>
                )}
              </ScrollView>
            )
          )}
          {busy && view === "list" && <ActivityIndicator color={colors.blue} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#10213B66",
    ...(Platform.OS === 'web' ? {} : { direction: 'ltr' as const }),
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "91%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    padding: 22,
  },
  handle: {
    width: 34,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#E1E8EF",
    alignSelf: "center",
    marginBottom: 18,
  },
  heading: { alignItems: "center", gap: 10, marginBottom: 15 },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.ink },
  icon: { padding: 10, borderRadius: 12, backgroundColor: "#F4F7FA" },
  list: { flexGrow: 0 },
  hint: {
    fontFamily: font.regular,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 24,
    marginBottom: 7,
  },
  car: {
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5ECF3",
    marginBottom: 10,
    backgroundColor: "#FAFCFE",
  },
  selected: { backgroundColor: "#EFF7F3", borderColor: "#CDE3D9" },
  name: {
    fontFamily: font.medium,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 25,
  },
  primary: {
    marginTop: 16,
    padding: 15,
    minHeight: 53,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  primaryText: { fontFamily: font.bold, fontSize: 13, color: "#fff" },
  label: {
    fontFamily: font.medium,
    fontSize: 11,
    color: colors.blue,
    marginTop: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DFE7EF",
    borderRadius: 14,
    padding: 13,
    color: colors.ink,
    fontFamily: font.regular,
    fontSize: 14,
    backgroundColor: "#F8FAFC",
  },
  inputRow: {
    borderWidth: 1,
    borderColor: "#DFE7EF",
    borderRadius: 14,
    padding: 13,
    alignItems: "center",
    gap: 10,
    marginBottom: 5,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  error: {
    fontFamily: font.regular,
    fontSize: 11,
    color: "#AC675E",
    lineHeight: 24,
    marginBottom: 10,
    textAlign: "center",
  },
  link: {
    fontFamily: font.medium,
    fontSize: 12,
    color: colors.blue,
    textAlign: "center",
    padding: 15,
  },
  remove: {
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
