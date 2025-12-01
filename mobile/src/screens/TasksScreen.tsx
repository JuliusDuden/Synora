import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import type { Task } from '../types';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await apiService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await apiService.createTask({
        title: newTaskTitle,
        priority: newTaskPriority,
        completed: false,
      });
      setNewTaskTitle('');
      setModalVisible(false);
      loadTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await apiService.updateTask(task.id, { completed: !task.completed });
      loadTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={32} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => toggleTask(item)}
          >
            <Ionicons
              name={item.completed ? 'checkbox' : 'square-outline'}
              size={24}
              color={item.completed ? '#10b981' : '#9ca3af'}
            />
            <View style={styles.taskContent}>
              <Text
                style={[
                  styles.taskTitle,
                  item.completed && styles.completedTask,
                ]}
              >
                {item.title}
              </Text>
              <Text style={styles.taskPriority}>Priority: {item.priority}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.input}
              placeholder="Task title"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createButton} onPress={createTask}>
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937' },
  taskCard: {
    flexDirection: 'row',
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
  taskContent: { marginLeft: 12, flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  completedTask: { textDecorationLine: 'line-through', color: '#9ca3af' },
  taskPriority: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelButton: { padding: 12, marginRight: 8 },
  cancelText: { color: '#6b7280' },
  createButton: { backgroundColor: '#6366f1', borderRadius: 8, padding: 12 },
  createText: { color: '#fff', fontWeight: '600' },
});
