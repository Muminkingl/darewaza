import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
const MotionContext = createContext(false);
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const l = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => l.remove();
  }, []);
  return (
    <MotionContext.Provider value={reduce}>{children}</MotionContext.Provider>
  );
}
export const useReducedMotion = () => useContext(MotionContext);
export function FadeIn({
  children,
  change,
  style,
}: {
  children: ReactNode;
  change?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const value = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    value.setValue(reduce ? 1 : 0);
    const a = Animated.timing(value, {
      toValue: 1,
      duration: 240,
      useNativeDriver: Platform.OS !== "web",
    });
    a.start();
    return () => a.stop();
  }, [change, reduce]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [7, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Tap({
  children,
  style,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduce = useReducedMotion();
  function animate(toValue: number) {
    if (!reduce)
      Animated.spring(scale, {
        toValue,
        useNativeDriver: Platform.OS !== "web",
        speed: 35,
        bounciness: 0,
      }).start();
  }
  return (
    <AnimatedPressable
      {...props}
      accessibilityRole={props.accessibilityRole || "button"}
      onPressIn={(e) => {
        animate(0.975);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1);
        props.onPressOut?.(e);
      }}
      style={[
        style,
        { transform: [{ scale }], opacity: props.disabled ? 0.5 : 1 },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
