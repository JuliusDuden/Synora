import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SnippetsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Snippets Screen - Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  text: { fontSize: 18, color: '#6b7280' },
});
