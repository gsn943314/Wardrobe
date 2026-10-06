import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

/** Pinch to zoom, drag to pan while zoomed, double-tap to toggle 2.5x. */
export function ZoomableImage({ uri, style }: { uri: string; style?: ViewStyle }) {
  const scale = useSharedValue(1);
  const start = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      start.set(scale.get());
    })
    .onUpdate((e) => {
      scale.set(Math.max(1, Math.min(5, start.get() * e.scale)));
    })
    .onEnd(() => {
      if (scale.get() < 1.05) {
        scale.set(withTiming(1));
        tx.set(withTiming(0));
        ty.set(withTiming(0));
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onBegin(() => {
      sx.set(tx.get());
      sy.set(ty.get());
    })
    .onUpdate((e) => {
      if (scale.get() <= 1.01) return;
      tx.set(sx.get() + e.translationX);
      ty.set(sy.get() + e.translationY);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomed = scale.get() > 1.01;
      scale.set(withTiming(zoomed ? 1 : 2.5));
      tx.set(withTiming(0));
      ty.set(withTiming(0));
    });

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={[styles.wrap, style]} collapsable={false}>
        <Animated.View style={[StyleSheet.absoluteFill, animated]}>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#000' },
});
