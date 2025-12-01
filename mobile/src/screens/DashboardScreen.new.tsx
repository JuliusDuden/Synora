import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../services/api';
import { colors, gradients } from '../theme/colors';

interface Stats {
  totalNotes: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalIdeas: number;
  activeHabits: number;
  totalSnippets: number;
}

export default function DashboardScreen({ navigation }: any) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [stats, setStats] = useState<Stats>({
    totalNotes: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalIdeas: 0,
    activeHabits: 0,
    totalSnippets: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [notes, projects, tasks, ideas, habits, snippets] = await Promise.all([
        apiService.getAllNotes().catch(() => []),
        apiService.getProjects().catch(() => []),
        apiService.getTasks(false).catch(() => []),
        apiService.getIdeas().catch(() => []),
        apiService.getHabits().catch(() => []),
        apiService.getSnippets().catch(() => []),
      ]);

      const today = new Date().toISOString().split('T')[0];

      setStats({
        totalNotes: notes.length,
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.completed || t.status === 'done').length,
        totalIdeas: ideas.length,
        activeHabits: habits.filter((h: any) => h.last_completed === today).length,
        totalSnippets: snippets.length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const statCards = [
    {
      title: 'Notes',
      value: stats.totalNotes,
      subtitle: 'Documents',
      icon: 'document-text',
      gradient: gradients.slate,
      screen: 'NotesList',
    },
    {
      title: 'Projects',
      value: stats.totalProjects,
      subtitle: 'Active',
      icon: 'folder',
      gradient: gradients.blue,
      screen: 'Projects',
    },
    {
      title: 'Tasks',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      subtitle: `${completionRate}% Complete`,
      icon: 'checkmark-done',
      gradient: gradients.green,
      screen: 'Tasks',
    },
    {
      title: 'Ideas',
      value: stats.totalIdeas,
      subtitle: 'Collected',
      icon: 'bulb',
      gradient: gradients.amber,
      screen: 'Ideas',
    },
    {
      title: 'Habits',
      value: stats.activeHabits,
      subtitle: 'Active Today',
      icon: 'fitness',
      gradient: gradients.purple,
      screen: 'Habits',
    },
    {
      title: 'Snippets',
      value: stats.totalSnippets,
      subtitle: 'Code Blocks',
      icon: 'code-slash',
      gradient: gradients.pink,
      screen: 'Snippets',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb' }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.title, { color: theme.foreground }]}>
              Dashboard
            </Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              Welcome back! Here's your overview
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.statCard, { backgroundColor: theme.card }]}
              onPress={() => navigation.navigate(card.screen)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={card.gradient}
                style={styles.statIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={card.icon as any} size={24} color="#fff" />
              </LinearGradient>
              
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: theme.foreground }]}>
                  {card.value}
                </Text>
                <Text style={[styles.statTitle, { color: theme.foreground }]}>
                  {card.title}
                </Text>
                <Text style={[styles.statSubtitle, { color: theme.muted }]}>
                  {card.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('NoteEditor')}
            >
              <Ionicons name="add-circle" size={24} color={theme.accent} />
              <Text style={[styles.actionText, { color: theme.foreground }]}>
                New Note
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('Tasks')}
            >
              <Ionicons name="add-circle" size={24} color={theme.accent} />
              <Text style={[styles.actionText, { color: theme.foreground }]}>
                New Task
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('Projects')}
            >
              <Ionicons name="add-circle" size={24} color={theme.accent} />
              <Text style={[styles.actionText, { color: theme.foreground }]}>
                New Project
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('Ideas')}
            >
              <Ionicons name="add-circle" size={24} color={theme.accent} />
              <Text style={[styles.actionText, { color: theme.foreground }]}>
                New Idea
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statSubtitle: {
    fontSize: 12,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
