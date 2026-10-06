import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from './theme';

export type DialogButton = { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void };
type DialogState = { title: string; message?: string; buttons: DialogButton[] };

let listener: ((d: DialogState | null) => void) | null = null;

/**
 * Same call shape as Alert.alert, rendered in-app so it also works on web, where
 * React Native's Alert is a no-op and browser dialogs may be blocked.
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]) {
  listener?.({ title, message, buttons: buttons?.length ? buttons : [{ text: '好' }] });
}

/** Mount once near the root of the app. */
export function DialogHost() {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    listener = setDialog;
    return () => {
      listener = null;
    };
  }, []);

  const press = (b: DialogButton) => {
    setDialog(null);
    b.onPress?.();
  };

  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => setDialog(null)}>
      <View style={styles.backdrop}>
        {dialog ? (
          <View style={styles.box}>
            <Text style={styles.title}>{dialog.title}</Text>
            {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.buttons}>
              {dialog.buttons.map((b) => (
                <Pressable key={b.text} onPress={() => press(b)} style={styles.button} hitSlop={6}>
                  <Text
                    style={[
                      styles.buttonText,
                      b.style === 'destructive' && { color: colors.danger },
                      b.style === 'cancel' && { color: colors.subtext },
                    ]}
                  >
                    {b.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,18,16,0.45)', alignItems: 'center', justifyContent: 'center', padding: space(8) },
  box: { backgroundColor: colors.card, borderRadius: radius + 4, padding: space(5), width: '100%', maxWidth: 360 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  message: { fontSize: 14, color: colors.text, marginTop: space(2), lineHeight: 20 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: space(5), marginTop: space(5) },
  button: { paddingVertical: space(1) },
  buttonText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
