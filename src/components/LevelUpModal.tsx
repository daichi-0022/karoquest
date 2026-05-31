import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';

interface Props {
  visible: boolean;
  newLevel: number;
  newTitle: string;
  onClose: () => void;
}

export default function LevelUpModal({ visible, newLevel, newTitle, onClose }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.5);
      flashAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();

      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.overlay, { opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }]}>
        <Animated.View style={[styles.box, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.flash}>✨</Text>
          <Text style={styles.levelUp}>レベルが上がった！</Text>
          <Text style={styles.levelNum}>Lv. {newLevel}</Text>
          <Text style={styles.title}>{newTitle}</Text>
          <Text style={styles.tap}>タップして閉じる</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: '#12122A', borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 2, borderColor: '#f59e0b', width: 280 },
  flash: { fontSize: 48, marginBottom: 12 },
  levelUp: { fontSize: 22, fontWeight: '900', color: '#f59e0b', marginBottom: 16, letterSpacing: 1 },
  levelNum: { fontSize: 64, fontWeight: '900', color: '#fff', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#a78bfa', marginBottom: 24 },
  tap: { fontSize: 12, color: '#444' },
});
