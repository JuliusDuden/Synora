import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import type { SearchResult } from '../types';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await apiService.search(text);
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.path}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() =>
              navigation.navigate('NoteEditor', { noteName: item.name })
            }
          >
            <Text style={styles.resultTitle}>{item.title || item.name}</Text>
            <Text style={styles.resultSnippet}>{item.snippet}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {query.length < 2 ? 'Type to search...' : 'No results found'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchInput: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  resultSnippet: { fontSize: 14, color: '#6b7280' },
  emptyText: { textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 16 },
});
