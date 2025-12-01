import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user?.username}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>2FA Enabled</Text>
        <Text style={styles.value}>{user?.is_2fa_enabled ? 'Yes' : 'No'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  value: { fontSize: 16, color: '#1f2937', fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
