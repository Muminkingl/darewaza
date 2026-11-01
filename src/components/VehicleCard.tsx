import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Car, ChevronDown, ArrowLeft, ArrowRight, Plus } from "./icons";
import { useGarage } from "../providers/GarageProvider";
import { useLanguage } from "../i18n";
import { vehicleName } from "../../shared/vehicles";
import { colors, font } from "../theme";
import { Tap } from "./Motion";
export function VehicleCard({
  onManage,
  onBrowse,
  compact = false,
}: {
  onManage: () => void;
  onBrowse?: () => void;
  compact?: boolean;
}) {
  const { t, row, align, rtl } = useLanguage();
  const garage = useGarage();
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  return (
    <View style={[s.card, compact && s.compact]}>
      <Tap
        style={[s.selector, row]}
        onPress={onManage}
        accessibilityLabel={t("changeCar")}
      >
        <View style={s.icon}>
          <Car size={23} color="#527C73" strokeWidth={1.6} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.label, align]}>{t("myCar")}</Text>
          <Text style={[s.name, align]} numberOfLines={1}>
            {garage.selected ? vehicleName(garage.selected) : t("chooseCar")}
          </Text>
        </View>
        {garage.loading ? (
          <ActivityIndicator size="small" color={colors.blue} />
        ) : garage.selected ? (
          <ChevronDown size={18} color="#84A298" />
        ) : (
          <Plus size={18} color="#84A298" />
        )}
      </Tap>
      {!compact && (
        <>
          <Text style={[s.hint, align]}>
            {garage.error
              ? t("syncError")
              : garage.selected
                ? [garage.selected.engine, garage.selected.trim]
                    .filter(Boolean)
                    .join(" · ") || t("carIntro")
                : t("carIntro")}
          </Text>
          <Tap
            style={[s.cta, row]}
            onPress={garage.selected && onBrowse ? onBrowse : onManage}
          >
            <Text style={s.ctaText}>
              {t(garage.selected ? "browseCar" : "addCar")}
            </Text>
            <Arrow size={16} color="#4E8274" />
          </Tap>
        </>
      )}
      {compact && garage.error && <Text style={s.hint}>{t("syncError")}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#D9E7E1",
    borderRadius: 23,
    backgroundColor: "#F1F7F3",
    padding: 18,
    marginBottom: 21,
  },
  compact: { padding: 12, marginBottom: 14, borderRadius: 17 },
  selector: { alignItems: "center", gap: 12 },
  icon: {
    height: 43,
    width: 43,
    borderRadius: 15,
    backgroundColor: "#E3EEE8",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: font.medium,
    fontSize: 9,
    color: "#88A096",
    marginBottom: 3,
  },
  name: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  hint: {
    fontFamily: font.regular,
    fontSize: 10,
    lineHeight: 23,
    color: "#84998F",
    marginTop: 10,
  },
  cta: { alignItems: "center", gap: 8, marginTop: 13, paddingVertical: 6 },
  ctaText: { fontFamily: font.bold, fontSize: 11, color: "#4E8274" },
});
