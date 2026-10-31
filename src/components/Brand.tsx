import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";

export function BrandMark({
  size = 44,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityLabel="Darewaza"
    >
      <Path
        d="M18 83V43a32 32 0 0 1 64 0v40H67V43a17 17 0 0 0-34 0v40Z"
        fill={light ? "#F7F8F3" : colors.navy}
      />
      <Path d="m43 83 3-35h8l3 35Z" fill="#72CEBB" />
    </Svg>
  );
}
export function Brand({
  light = false,
  small = false,
}: {
  light?: boolean;
  small?: boolean;
}) {
  return (
    <View style={s.row}>
      <BrandMark size={small ? 28 : 38} light={light} />
      <Text
        style={[
          s.word,
          { fontSize: small ? 20 : 26, color: light ? "#fff" : colors.navy },
        ]}
      >
        Darewaza<Text style={{ color: "#72CEBB" }}>.</Text>
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  word: { fontWeight: "700", letterSpacing: -1 },
});
