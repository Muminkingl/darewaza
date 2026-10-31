import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { BrandMark } from "./Brand";
import { useReducedMotion } from "./Motion";
import { useLanguage } from "../i18n";
import { font } from "../theme";
export function InitialLoader() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(v, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [reduce]);
  return (
    <View style={s.screen}>
      <View style={s.orbit} />
      <View style={s.logo}>
        <BrandMark size={88} light />
      </View>
      <Text style={s.name}>
        Darewaza<Text style={{ color: "#72CEBB" }}>.</Text>
      </Text>
      <Animated.View style={[s.dot, { opacity: reduce ? 1 : v }]} />
      <Text style={s.note}>{t("loading")}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#172D57",
    alignItems: "center",
    justifyContent: "center",
  },
  orbit: {
    position: "absolute",
    width: 270,
    height: 270,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: "#FFFFFF0D",
  },
  logo: { padding: 20 },
  name: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -1.5,
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#72CEBB",
    marginTop: 60,
  },
  note: {
    fontFamily: font.regular,
    fontSize: 11,
    color: "#B8C8DC",
    marginTop: 15,
  },
});
