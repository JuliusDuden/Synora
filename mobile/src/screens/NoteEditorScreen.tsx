import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import type { Note } from '../types';

export default function NoteEditorScreen({ route, navigation }: any) {
  const { noteName } = route.params || {};
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(!!noteName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (noteName) {
      loadNote();
    }
  }, [noteName]);

  const loadNote = async () => {
    try {
      const note = await apiService.getNote(noteName);
      setTitle(note.metadata.title || note.name);
      setContent(note.content);
    } catch (error) {
      console.error('Failed to load note:', error);
      Alert.alert('Error', 'Failed to load note');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const noteContent = `---
title: ${title}
---

${content}`;

      if (noteName) {
        await apiService.updateNote(noteName, noteContent);
      } else {
        const fileName = title.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.md';
        await apiService.createNote(fileName, noteContent);
      }

      Alert.alert('Success', 'Note saved successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {noteName ? 'Edit Note' : 'New Note'}
        </Text>
        <TouchableOpacity onPress={saveNote} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#6366f1" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editorContainer}>
        <TextInput
          style={styles.titleInput}
          placeholder="Note Title"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#9ca3af"
        />

        <TextInput
          style={styles.contentInput}
          placeholder="Start writing..."
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    minHeight: 400,
    padding: 0,
  },
});
