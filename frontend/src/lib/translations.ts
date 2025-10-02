/**
 * Synora - Internationalization (i18n)
 * Translations for DE, EN, FR, ES
 */

export type Language = 'de' | 'en' | 'fr' | 'es';

export interface Translations {
  // App Name & Motto
  appName: string;
  appMotto: string;

  // Navigation
  nav: {
    dashboard: string;
    notes: string;
    graph: string;
    projects: string;
    tasks: string;
    ideas: string;
    habits: string;
    settings: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    subtitle: string;
    welcome: string;
    stats: {
      notes: string;
      documents: string;
      projects: string;
      activeProjects: string;
      tasks: string;
      completed: string;
      ideas: string;
      collected: string;
      habits: string;
      activeHabits: string;
    };
    recentActivity: string;
    quickActions: string;
  };

  // Notes
  notes: {
    title: string;
    newNote: string;
    dailyNote: string;
    filterPlaceholder: string;
    noNotes: string;
    loading: string;
    tags: string;
    backlinks: string;
    metadata: string;
    created: string;
    modified: string;
    editTitle: string;
    saveTitle: string;
    saving: string;
    saved: string;
  };

  // Projects
  projects: {
    title: string;
    subtitle: string;
    newProject: string;
    projectName: string;
    projectDescription: string;
    status: string;
    statusActive: string;
    statusPlanning: string;
    statusCompleted: string;
    progress: string;
    create: string;
    cancel: string;
    back: string;
    backToProjects: string;
    overview: string;
    notesSection: string;
    tasksSection: string;
    newNote: string;
    newTask: string;
    noNotes: string;
    noTasks: string;
    createNoteForProject: string;
    tasksCompleted: string;
    loading: string;
    delete: string;
    confirmDelete: string;
  };

  // Tasks
  tasks: {
    title: string;
    subtitle: string;
    newTask: string;
    todo: string;
    inProgress: string;
    done: string;
    priority: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;
    taskTitle: string;
    create: string;
    cancel: string;
    noTasks: string;
    project: string;
    noProject: string;
    overview: string;
    open: string;
    completed: string;
    total: string;
  };

  // Ideas
  ideas: {
    title: string;
    subtitle: string;
    newIdea: string;
    ideaTitle: string;
    ideaDescription: string;
    create: string;
    cancel: string;
    noIdeas: string;
    delete: string;
  };

  // Habits
  habits: {
    title: string;
    subtitle: string;
    newHabit: string;
    habitName: string;
    frequency: string;
    daily: string;
    weekly: string;
    create: string;
    cancel: string;
    noHabits: string;
    markComplete: string;
    currentStreak: string;
    days: string;
    delete: string;
  };

  // Settings
  settings: {
    title: string;
    subtitle: string;
    appearance: string;
    darkMode: string;
    darkModeDesc: string;
    language: string;
    languageDesc: string;
    dataManagement: string;
    storage: string;
    storageUsed: string;
    exportData: string;
    exportDesc: string;
    deleteAll: string;
    deleteWarning: string;
    deleteConfirm: string;
    deleteConfirmText: string;
    dataDeleted: string;
    about: string;
    version: string;
    platform: string;
    description: string;
  };

  // Authentication
  auth: {
    login: string;
    register: string;
    logout: string;
    email: string;
    password: string;
    username: string;
    confirmPassword: string;
    forgotPassword: string;
    rememberMe: string;
    noAccount: string;
    hasAccount: string;
    loginButton: string;
    registerButton: string;
    loginSuccess: string;
    registerSuccess: string;
    invalidCredentials: string;
    emailRequired: string;
    passwordRequired: string;
    passwordTooShort: string;
    passwordMismatch: string;
    emailInvalid: string;
    twoFactorCode: string;
    twoFactorRequired: string;
    enable2FA: string;
    disable2FA: string;
    setup2FA: string;
    scanQRCode: string;
    enterCodeFromApp: string;
    backupCodes: string;
    saveBackupCodes: string;
    backupCodesWarning: string;
    verify2FA: string;
    twoFactorEnabled: string;
    twoFactorDisabled: string;
    accountLocked: string;
  };

  // Common
  common: {
    search: string;
    save: string;
    edit: string;
    delete: string;
    cancel: string;
    create: string;
    close: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    yes: string;
    no: string;
    progress: string;
    activities: string;
  };
}

export const translations: Record<Language, Translations> = {
  de: {
    appName: 'Synora',
    appMotto: 'Think Beyond.',

    nav: {
      dashboard: 'Dashboard',
      notes: 'Notizen',
      graph: 'Graph',
      projects: 'Projekte',
      tasks: 'Aufgaben',
      ideas: 'Ideen',
      habits: 'Gewohnheiten',
      settings: 'Einstellungen',
    },

    dashboard: {
      title: 'Dashboard',
      subtitle: 'Deine Übersicht',
      welcome: 'Willkommen zurück',
      stats: {
        notes: 'Notizen',
        documents: 'Dokumente',
        projects: 'Projekte',
        activeProjects: 'Aktive Projekte',
        tasks: 'Aufgaben',
        completed: 'Erledigt',
        ideas: 'Ideen',
        collected: 'Gesammelt',
        habits: 'Gewohnheiten',
        activeHabits: 'Aktive Gewohnheiten',
      },
      recentActivity: 'Letzte Aktivitäten',
      quickActions: 'Schnellaktionen',
    },

    notes: {
      title: 'Notizen',
      newNote: 'Neue Notiz',
      dailyNote: 'Tagesnotiz',
      filterPlaceholder: 'Notizen filtern...',
      noNotes: 'Keine Notizen gefunden',
      loading: 'Lädt...',
      tags: 'Tags',
      backlinks: 'Backlinks',
      metadata: 'Metadaten',
      created: 'Erstellt',
      modified: 'Geändert',
      editTitle: 'Titel bearbeiten',
      saveTitle: 'Titel speichern',
      saving: 'Speichert...',
      saved: 'Gespeichert',
    },

    projects: {
      title: 'Projekte',
      subtitle: 'Projekt',
      newProject: 'Neues Projekt',
      projectName: 'Projektname',
      projectDescription: 'Projektbeschreibung',
      status: 'Status',
      statusActive: 'Aktiv',
      statusPlanning: 'Planung',
      statusCompleted: 'Abgeschlossen',
      progress: 'Fortschritt',
      create: 'Erstellen',
      cancel: 'Abbrechen',
      back: 'Zurück',
      backToProjects: 'Zurück zu Projekten',
      overview: 'Übersicht',
      notesSection: 'Notizen',
      tasksSection: 'Aufgaben',
      newNote: 'Neue Note',
      newTask: 'Neue Aufgabe',
      noNotes: 'Noch keine Notizen. Erstelle eine Note für dieses Projekt.',
      noTasks: 'Noch keine Aufgaben für dieses Projekt.',
      createNoteForProject: 'Notiz für Projekt erstellen',
      tasksCompleted: 'Aufgaben erledigt',
      loading: 'Lädt...',
      delete: 'Löschen',
      confirmDelete: 'Projekt wirklich löschen?',
    },

    tasks: {
      title: 'Aufgaben',
      subtitle: 'Aufgabe',
      newTask: 'Neue Aufgabe',
      todo: 'Zu erledigen',
      inProgress: 'In Bearbeitung',
      done: 'Erledigt',
      priority: 'Priorität',
      priorityHigh: 'Hoch',
      priorityMedium: 'Mittel',
      priorityLow: 'Niedrig',
      taskTitle: 'Aufgabentitel',
      create: 'Erstellen',
      cancel: 'Abbrechen',
      noTasks: 'Keine Aufgaben in dieser Kategorie',
      project: 'Projekt',
      noProject: 'Kein Projekt',
      overview: 'Aufgaben-Übersicht',
      open: 'Offen',
      completed: 'Erledigt',
      total: 'Gesamt',
    },

    ideas: {
      title: 'Ideen',
      subtitle: 'Idee',
      newIdea: 'Neue Idee',
      ideaTitle: 'Ideentitel',
      ideaDescription: 'Beschreibung',
      create: 'Erstellen',
      cancel: 'Abbrechen',
      noIdeas: 'Noch keine Ideen. Füge deine erste Idee hinzu!',
      delete: 'Löschen',
    },

    habits: {
      title: 'Gewohnheiten',
      subtitle: 'Gewohnheit',
      newHabit: 'Neue Gewohnheit',
      habitName: 'Name der Gewohnheit',
      frequency: 'Frequenz',
      daily: 'Täglich',
      weekly: 'Wöchentlich',
      create: 'Erstellen',
      cancel: 'Abbrechen',
      noHabits: 'Noch keine Gewohnheiten. Starte mit einer neuen Gewohnheit!',
      markComplete: 'Als erledigt markieren',
      currentStreak: 'Aktuelle Serie',
      days: 'Tage',
      delete: 'Löschen',
    },

    settings: {
      title: 'Einstellungen',
      subtitle: 'Personalisiere dein Synora',
      appearance: 'Erscheinungsbild',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Dunkles Farbschema verwenden',
      language: 'Sprache',
      languageDesc: 'Wähle deine bevorzugte Sprache',
      dataManagement: 'Datenverwaltung',
      storage: 'Speicherplatz',
      storageUsed: 'verwendet',
      exportData: 'Daten exportieren',
      exportDesc: 'Exportiert alle deine Daten als JSON-Datei',
      deleteAll: 'Alle Daten löschen',
      deleteWarning: 'Warnung: Diese Aktion kann nicht rückgängig gemacht werden',
      deleteConfirm: 'Alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
      deleteConfirmText: 'Bist du sicher? Alle Notizen, Projekte, Aufgaben, Ideen und Gewohnheiten werden gelöscht.',
      dataDeleted: 'Alle Daten wurden gelöscht.',
      about: 'Über',
      version: 'Version',
      platform: 'Plattform',
      description: 'Think Beyond. Dein persönlicher Wissens- und Produktivitätsmanager',
    },

    auth: {
      login: 'Anmelden',
      register: 'Registrieren',
      logout: 'Abmelden',
      email: 'E-Mail',
      password: 'Passwort',
      username: 'Benutzername',
      confirmPassword: 'Passwort bestätigen',
      forgotPassword: 'Passwort vergessen?',
      rememberMe: 'Angemeldet bleiben',
      noAccount: 'Noch kein Konto?',
      hasAccount: 'Bereits ein Konto?',
      loginButton: 'Anmelden',
      registerButton: 'Konto erstellen',
      loginSuccess: 'Erfolgreich angemeldet',
      registerSuccess: 'Konto erfolgreich erstellt',
      invalidCredentials: 'Ungültige E-Mail oder Passwort',
      emailRequired: 'E-Mail ist erforderlich',
      passwordRequired: 'Passwort ist erforderlich',
      passwordTooShort: 'Passwort muss mindestens 8 Zeichen lang sein',
      passwordMismatch: 'Passwörter stimmen nicht überein',
      emailInvalid: 'Ungültige E-Mail-Adresse',
      twoFactorCode: '2FA-Code',
      twoFactorRequired: '2FA-Code erforderlich',
      enable2FA: '2FA aktivieren',
      disable2FA: '2FA deaktivieren',
      setup2FA: '2FA einrichten',
      scanQRCode: 'QR-Code mit Authenticator-App scannen',
      enterCodeFromApp: 'Code aus deiner App eingeben',
      backupCodes: 'Backup-Codes',
      saveBackupCodes: 'Speichere diese Codes sicher!',
      backupCodesWarning: 'Bewahre diese Codes an einem sicheren Ort auf. Du benötigst sie, wenn du keinen Zugriff auf deine Authenticator-App hast.',
      verify2FA: '2FA verifizieren',
      twoFactorEnabled: '2FA erfolgreich aktiviert',
      twoFactorDisabled: '2FA deaktiviert',
      accountLocked: 'Konto vorübergehend gesperrt',
    },

    common: {
      search: 'Suchen',
      save: 'Speichern',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      cancel: 'Abbrechen',
      create: 'Erstellen',
      close: 'Schließen',
      loading: 'Lädt...',
      error: 'Fehler',
      success: 'Erfolg',
      confirm: 'Bestätigen',
      yes: 'Ja',
      no: 'Nein',
      progress: 'Fortschritt',
      activities: 'Aktivitäten',
    },
  },

  en: {
    appName: 'Synora',
    appMotto: 'Think Beyond.',

    nav: {
      dashboard: 'Dashboard',
      notes: 'Notes',
      graph: 'Graph',
      projects: 'Projects',
      tasks: 'Tasks',
      ideas: 'Ideas',
      habits: 'Habits',
      settings: 'Settings',
    },

    dashboard: {
      title: 'Dashboard',
      subtitle: 'Your Overview',
      welcome: 'Welcome back',
      stats: {
        notes: 'Notes',
        documents: 'Documents',
        projects: 'Projects',
        activeProjects: 'Active Projects',
        tasks: 'Tasks',
        completed: 'Completed',
        ideas: 'Ideas',
        collected: 'Collected',
        habits: 'Habits',
        activeHabits: 'Active Habits',
      },
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
    },

    notes: {
      title: 'Notes',
      newNote: 'New Note',
      dailyNote: 'Daily Note',
      filterPlaceholder: 'Filter notes...',
      noNotes: 'No notes found',
      loading: 'Loading...',
      tags: 'Tags',
      backlinks: 'Backlinks',
      metadata: 'Metadata',
      created: 'Created',
      modified: 'Modified',
      editTitle: 'Edit Title',
      saveTitle: 'Save Title',
      saving: 'Saving...',
      saved: 'Saved',
    },

    projects: {
      title: 'Projects',
      subtitle: 'Project',
      newProject: 'New Project',
      projectName: 'Project Name',
      projectDescription: 'Project Description',
      status: 'Status',
      statusActive: 'Active',
      statusPlanning: 'Planning',
      statusCompleted: 'Completed',
      progress: 'Progress',
      create: 'Create',
      cancel: 'Cancel',
      back: 'Back',
      backToProjects: 'Back to Projects',
      overview: 'Overview',
      notesSection: 'Notes',
      tasksSection: 'Tasks',
      newNote: 'New Note',
      newTask: 'New Task',
      noNotes: 'No notes yet. Create a note for this project.',
      noTasks: 'No tasks for this project yet.',
      createNoteForProject: 'Create note for project',
      tasksCompleted: 'Tasks completed',
      loading: 'Loading...',
      delete: 'Delete',
      confirmDelete: 'Really delete project?',
    },

    tasks: {
      title: 'Tasks',
      subtitle: 'Task',
      newTask: 'New Task',
      todo: 'To Do',
      inProgress: 'In Progress',
      done: 'Done',
      priority: 'Priority',
      priorityHigh: 'High',
      priorityMedium: 'Medium',
      priorityLow: 'Low',
      taskTitle: 'Task Title',
      create: 'Create',
      cancel: 'Cancel',
      noTasks: 'No tasks in this category',
      project: 'Project',
      noProject: 'No Project',
      overview: 'Tasks Overview',
      open: 'Open',
      completed: 'Completed',
      total: 'Total',
    },

    ideas: {
      title: 'Ideas',
      subtitle: 'Idea',
      newIdea: 'New Idea',
      ideaTitle: 'Idea Title',
      ideaDescription: 'Description',
      create: 'Create',
      cancel: 'Cancel',
      noIdeas: 'No ideas yet. Add your first idea!',
      delete: 'Delete',
    },

    habits: {
      title: 'Habits',
      subtitle: 'Habit',
      newHabit: 'New Habit',
      habitName: 'Habit Name',
      frequency: 'Frequency',
      daily: 'Daily',
      weekly: 'Weekly',
      create: 'Create',
      cancel: 'Cancel',
      noHabits: 'No habits yet. Start with a new habit!',
      markComplete: 'Mark as complete',
      currentStreak: 'Current Streak',
      days: 'days',
      delete: 'Delete',
    },

    settings: {
      title: 'Settings',
      subtitle: 'Personalize your Synora',
      appearance: 'Appearance',
      darkMode: 'Dark Mode',
      darkModeDesc: 'Use dark color scheme',
      language: 'Language',
      languageDesc: 'Choose your preferred language',
      dataManagement: 'Data Management',
      storage: 'Storage',
      storageUsed: 'used',
      exportData: 'Export Data',
      exportDesc: 'Exports all your data as JSON file',
      deleteAll: 'Delete All Data',
      deleteWarning: 'Warning: This action cannot be undone',
      deleteConfirm: 'Delete all data? This action cannot be undone.',
      deleteConfirmText: 'Are you sure? All notes, projects, tasks, ideas and habits will be deleted.',
      dataDeleted: 'All data has been deleted.',
      about: 'About',
      version: 'Version',
      platform: 'Platform',
      description: 'Think Beyond. Your personal knowledge and productivity manager',
    },

    auth: {
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      username: 'Username',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot password?',
      rememberMe: 'Remember me',
      noAccount: 'Don\'t have an account?',
      hasAccount: 'Already have an account?',
      loginButton: 'Sign in',
      registerButton: 'Create account',
      loginSuccess: 'Successfully logged in',
      registerSuccess: 'Account created successfully',
      invalidCredentials: 'Invalid email or password',
      emailRequired: 'Email is required',
      passwordRequired: 'Password is required',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      emailInvalid: 'Invalid email address',
      twoFactorCode: '2FA Code',
      twoFactorRequired: '2FA code required',
      enable2FA: 'Enable 2FA',
      disable2FA: 'Disable 2FA',
      setup2FA: 'Setup 2FA',
      scanQRCode: 'Scan QR code with authenticator app',
      enterCodeFromApp: 'Enter code from your app',
      backupCodes: 'Backup Codes',
      saveBackupCodes: 'Save these codes securely!',
      backupCodesWarning: 'Keep these codes in a safe place. You will need them if you lose access to your authenticator app.',
      verify2FA: 'Verify 2FA',
      twoFactorEnabled: '2FA enabled successfully',
      twoFactorDisabled: '2FA disabled',
      accountLocked: 'Account temporarily locked',
    },

    common: {
      search: 'Search',
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      create: 'Create',
      close: 'Close',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      progress: 'Progress',
      activities: 'Activities',
    },
  },

  fr: {
    appName: 'Synora',
    appMotto: 'Think Beyond.',

    nav: {
      dashboard: 'Tableau de bord',
      notes: 'Notes',
      graph: 'Graphique',
      projects: 'Projets',
      tasks: 'Tâches',
      ideas: 'Idées',
      habits: 'Habitudes',
      settings: 'Paramètres',
    },

    dashboard: {
      title: 'Tableau de bord',
      subtitle: 'Votre aperçu',
      welcome: 'Bienvenue',
      stats: {
        notes: 'Notes',
        documents: 'Documents',
        projects: 'Projets',
        activeProjects: 'Projets actifs',
        tasks: 'Tâches',
        completed: 'Terminées',
        ideas: 'Idées',
        collected: 'Collectées',
        habits: 'Habitudes',
        activeHabits: 'Habitudes actives',
      },
      recentActivity: 'Activité récente',
      quickActions: 'Actions rapides',
    },

    notes: {
      title: 'Notes',
      newNote: 'Nouvelle note',
      dailyNote: 'Note quotidienne',
      filterPlaceholder: 'Filtrer les notes...',
      noNotes: 'Aucune note trouvée',
      loading: 'Chargement...',
      tags: 'Tags',
      backlinks: 'Rétroliens',
      metadata: 'Métadonnées',
      created: 'Créé',
      modified: 'Modifié',
      editTitle: 'Modifier le titre',
      saveTitle: 'Enregistrer le titre',
      saving: 'Enregistrement...',
      saved: 'Enregistré',
    },

    projects: {
      title: 'Projets',
      subtitle: 'Projet',
      newProject: 'Nouveau projet',
      projectName: 'Nom du projet',
      projectDescription: 'Description du projet',
      status: 'Statut',
      statusActive: 'Actif',
      statusPlanning: 'Planification',
      statusCompleted: 'Terminé',
      progress: 'Progrès',
      create: 'Créer',
      cancel: 'Annuler',
      back: 'Retour',
      backToProjects: 'Retour aux projets',
      overview: 'Aperçu',
      notesSection: 'Notes',
      tasksSection: 'Tâches',
      newNote: 'Nouvelle note',
      newTask: 'Nouvelle tâche',
      noNotes: 'Pas encore de notes. Créez une note pour ce projet.',
      noTasks: 'Pas encore de tâches pour ce projet.',
      createNoteForProject: 'Créer une note pour le projet',
      tasksCompleted: 'Tâches terminées',
      loading: 'Chargement...',
      delete: 'Supprimer',
      confirmDelete: 'Vraiment supprimer le projet?',
    },

    tasks: {
      title: 'Tâches',
      subtitle: 'Tâche',
      newTask: 'Nouvelle tâche',
      todo: 'À faire',
      inProgress: 'En cours',
      done: 'Terminé',
      priority: 'Priorité',
      priorityHigh: 'Haute',
      priorityMedium: 'Moyenne',
      priorityLow: 'Basse',
      taskTitle: 'Titre de la tâche',
      create: 'Créer',
      cancel: 'Annuler',
      noTasks: 'Aucune tâche dans cette catégorie',
      project: 'Projet',
      noProject: 'Aucun projet',
      overview: 'Aperçu des tâches',
      open: 'Ouvert',
      completed: 'Terminé',
      total: 'Total',
    },

    ideas: {
      title: 'Idées',
      subtitle: 'Idée',
      newIdea: 'Nouvelle idée',
      ideaTitle: 'Titre de l\'idée',
      ideaDescription: 'Description',
      create: 'Créer',
      cancel: 'Annuler',
      noIdeas: 'Pas encore d\'idées. Ajoutez votre première idée!',
      delete: 'Supprimer',
    },

    habits: {
      title: 'Habitudes',
      subtitle: 'Habitude',
      newHabit: 'Nouvelle habitude',
      habitName: 'Nom de l\'habitude',
      frequency: 'Fréquence',
      daily: 'Quotidienne',
      weekly: 'Hebdomadaire',
      create: 'Créer',
      cancel: 'Annuler',
      noHabits: 'Pas encore d\'habitudes. Commencez avec une nouvelle habitude!',
      markComplete: 'Marquer comme terminé',
      currentStreak: 'Série actuelle',
      days: 'jours',
      delete: 'Supprimer',
    },

    settings: {
      title: 'Paramètres',
      subtitle: 'Personnalisez votre Synora',
      appearance: 'Apparence',
      darkMode: 'Mode sombre',
      darkModeDesc: 'Utiliser le schéma de couleurs sombre',
      language: 'Langue',
      languageDesc: 'Choisissez votre langue préférée',
      dataManagement: 'Gestion des données',
      storage: 'Stockage',
      storageUsed: 'utilisé',
      exportData: 'Exporter les données',
      exportDesc: 'Exporte toutes vos données en fichier JSON',
      deleteAll: 'Supprimer toutes les données',
      deleteWarning: 'Attention: Cette action ne peut pas être annulée',
      deleteConfirm: 'Supprimer toutes les données? Cette action ne peut pas être annulée.',
      deleteConfirmText: 'Êtes-vous sûr? Toutes les notes, projets, tâches, idées et habitudes seront supprimés.',
      dataDeleted: 'Toutes les données ont été supprimées.',
      about: 'À propos',
      version: 'Version',
      platform: 'Plateforme',
      description: 'Think Beyond. Votre gestionnaire personnel de connaissances et de productivité',
    },

    auth: {
      login: 'Connexion',
      register: 'S\'inscrire',
      logout: 'Déconnexion',
      email: 'E-mail',
      password: 'Mot de passe',
      username: 'Nom d\'utilisateur',
      confirmPassword: 'Confirmer le mot de passe',
      forgotPassword: 'Mot de passe oublié?',
      rememberMe: 'Se souvenir de moi',
      noAccount: 'Pas encore de compte?',
      hasAccount: 'Vous avez déjà un compte?',
      loginButton: 'Se connecter',
      registerButton: 'Créer un compte',
      loginSuccess: 'Connexion réussie',
      registerSuccess: 'Compte créé avec succès',
      invalidCredentials: 'E-mail ou mot de passe invalide',
      emailRequired: 'L\'e-mail est requis',
      passwordRequired: 'Le mot de passe est requis',
      passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      emailInvalid: 'Adresse e-mail invalide',
      twoFactorCode: 'Code 2FA',
      twoFactorRequired: 'Code 2FA requis',
      enable2FA: 'Activer 2FA',
      disable2FA: 'Désactiver 2FA',
      setup2FA: 'Configurer 2FA',
      scanQRCode: 'Scanner le code QR avec l\'application authenticator',
      enterCodeFromApp: 'Entrer le code de votre application',
      backupCodes: 'Codes de sauvegarde',
      saveBackupCodes: 'Sauvegardez ces codes en sécurité!',
      backupCodesWarning: 'Conservez ces codes dans un endroit sûr. Vous en aurez besoin si vous perdez l\'accès à votre application authenticator.',
      verify2FA: 'Vérifier 2FA',
      twoFactorEnabled: '2FA activé avec succès',
      twoFactorDisabled: '2FA désactivé',
      accountLocked: 'Compte temporairement verrouillé',
    },

    common: {
      search: 'Rechercher',
      save: 'Enregistrer',
      edit: 'Modifier',
      delete: 'Supprimer',
      cancel: 'Annuler',
      create: 'Créer',
      close: 'Fermer',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      confirm: 'Confirmer',
      yes: 'Oui',
      no: 'Non',
      progress: 'Progrès',
      activities: 'Activités',
    },
  },

  es: {
    appName: 'Synora',
    appMotto: 'Think Beyond.',

    nav: {
      dashboard: 'Panel',
      notes: 'Notas',
      graph: 'Gráfico',
      projects: 'Proyectos',
      tasks: 'Tareas',
      ideas: 'Ideas',
      habits: 'Hábitos',
      settings: 'Configuración',
    },

    dashboard: {
      title: 'Panel',
      subtitle: 'Tu resumen',
      welcome: 'Bienvenido',
      stats: {
        notes: 'Notas',
        documents: 'Documentos',
        projects: 'Proyectos',
        activeProjects: 'Proyectos activos',
        tasks: 'Tareas',
        completed: 'Completadas',
        ideas: 'Ideas',
        collected: 'Recopiladas',
        habits: 'Hábitos',
        activeHabits: 'Hábitos activos',
      },
      recentActivity: 'Actividad reciente',
      quickActions: 'Acciones rápidas',
    },

    notes: {
      title: 'Notas',
      newNote: 'Nueva nota',
      dailyNote: 'Nota diaria',
      filterPlaceholder: 'Filtrar notas...',
      noNotes: 'No se encontraron notas',
      loading: 'Cargando...',
      tags: 'Etiquetas',
      backlinks: 'Retroenlaces',
      metadata: 'Metadatos',
      created: 'Creado',
      modified: 'Modificado',
      editTitle: 'Editar título',
      saveTitle: 'Guardar título',
      saving: 'Guardando...',
      saved: 'Guardado',
    },

    projects: {
      title: 'Proyectos',
      subtitle: 'Proyecto',
      newProject: 'Nuevo proyecto',
      projectName: 'Nombre del proyecto',
      projectDescription: 'Descripción del proyecto',
      status: 'Estado',
      statusActive: 'Activo',
      statusPlanning: 'Planificación',
      statusCompleted: 'Completado',
      progress: 'Progreso',
      create: 'Crear',
      cancel: 'Cancelar',
      back: 'Volver',
      backToProjects: 'Volver a proyectos',
      overview: 'Resumen',
      notesSection: 'Notas',
      tasksSection: 'Tareas',
      newNote: 'Nueva nota',
      newTask: 'Nueva tarea',
      noNotes: 'Aún no hay notas. Crea una nota para este proyecto.',
      noTasks: 'Aún no hay tareas para este proyecto.',
      createNoteForProject: 'Crear nota para el proyecto',
      tasksCompleted: 'Tareas completadas',
      loading: 'Cargando...',
      delete: 'Eliminar',
      confirmDelete: '¿Realmente eliminar el proyecto?',
    },

    tasks: {
      title: 'Tareas',
      subtitle: 'Tarea',
      newTask: 'Nueva tarea',
      todo: 'Por hacer',
      inProgress: 'En progreso',
      done: 'Hecho',
      priority: 'Prioridad',
      priorityHigh: 'Alta',
      priorityMedium: 'Media',
      priorityLow: 'Baja',
      taskTitle: 'Título de la tarea',
      create: 'Crear',
      cancel: 'Cancelar',
      noTasks: 'No hay tareas en esta categoría',
      project: 'Proyecto',
      noProject: 'Sin proyecto',
      overview: 'Resumen de tareas',
      open: 'Abierto',
      completed: 'Completado',
      total: 'Total',
    },

    ideas: {
      title: 'Ideas',
      subtitle: 'Idea',
      newIdea: 'Nueva idea',
      ideaTitle: 'Título de la idea',
      ideaDescription: 'Descripción',
      create: 'Crear',
      cancel: 'Cancelar',
      noIdeas: 'Aún no hay ideas. ¡Agrega tu primera idea!',
      delete: 'Eliminar',
    },

    habits: {
      title: 'Hábitos',
      subtitle: 'Hábito',
      newHabit: 'Nuevo hábito',
      habitName: 'Nombre del hábito',
      frequency: 'Frecuencia',
      daily: 'Diario',
      weekly: 'Semanal',
      create: 'Crear',
      cancel: 'Cancelar',
      noHabits: 'Aún no hay hábitos. ¡Comienza con un nuevo hábito!',
      markComplete: 'Marcar como completado',
      currentStreak: 'Racha actual',
      days: 'días',
      delete: 'Eliminar',
    },

    settings: {
      title: 'Configuración',
      subtitle: 'Personaliza tu Synora',
      appearance: 'Apariencia',
      darkMode: 'Modo oscuro',
      darkModeDesc: 'Usar esquema de colores oscuro',
      language: 'Idioma',
      languageDesc: 'Elige tu idioma preferido',
      dataManagement: 'Gestión de datos',
      storage: 'Almacenamiento',
      storageUsed: 'usado',
      exportData: 'Exportar datos',
      exportDesc: 'Exporta todos tus datos como archivo JSON',
      deleteAll: 'Eliminar todos los datos',
      deleteWarning: 'Advertencia: Esta acción no se puede deshacer',
      deleteConfirm: '¿Eliminar todos los datos? Esta acción no se puede deshacer.',
      deleteConfirmText: '¿Estás seguro? Se eliminarán todas las notas, proyectos, tareas, ideas y hábitos.',
      dataDeleted: 'Todos los datos han sido eliminados.',
      about: 'Acerca de',
      version: 'Versión',
      platform: 'Plataforma',
      description: 'Think Beyond. Tu gestor personal de conocimiento y productividad',
    },

    auth: {
      login: 'Iniciar sesión',
      register: 'Registrarse',
      logout: 'Cerrar sesión',
      email: 'Correo electrónico',
      password: 'Contraseña',
      username: 'Nombre de usuario',
      confirmPassword: 'Confirmar contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      rememberMe: 'Recuérdame',
      noAccount: '¿No tienes cuenta?',
      hasAccount: '¿Ya tienes cuenta?',
      loginButton: 'Iniciar sesión',
      registerButton: 'Crear cuenta',
      loginSuccess: 'Sesión iniciada correctamente',
      registerSuccess: 'Cuenta creada correctamente',
      invalidCredentials: 'Correo o contraseña inválidos',
      emailRequired: 'El correo es obligatorio',
      passwordRequired: 'La contraseña es obligatoria',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
      passwordMismatch: 'Las contraseñas no coinciden',
      emailInvalid: 'Dirección de correo inválida',
      twoFactorCode: 'Código 2FA',
      twoFactorRequired: 'Código 2FA requerido',
      enable2FA: 'Activar 2FA',
      disable2FA: 'Desactivar 2FA',
      setup2FA: 'Configurar 2FA',
      scanQRCode: 'Escanea el código QR con la app authenticator',
      enterCodeFromApp: 'Ingresa el código de tu app',
      backupCodes: 'Códigos de respaldo',
      saveBackupCodes: '¡Guarda estos códigos de forma segura!',
      backupCodesWarning: 'Mantén estos códigos en un lugar seguro. Los necesitarás si pierdes acceso a tu app authenticator.',
      verify2FA: 'Verificar 2FA',
      twoFactorEnabled: '2FA activado correctamente',
      twoFactorDisabled: '2FA desactivado',
      accountLocked: 'Cuenta bloqueada temporalmente',
    },

    common: {
      search: 'Buscar',
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      cancel: 'Cancelar',
      create: 'Crear',
      close: 'Cerrar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      confirm: 'Confirmar',
      yes: 'Sí',
      no: 'No',
      progress: 'Progreso',
      activities: 'Actividades',
    },
  },
};

export function getTranslations(language: Language): Translations {
  return translations[language] || translations.de;
}

export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'de';
  
  const settings = localStorage.getItem('settings');
  if (settings) {
    const parsed = JSON.parse(settings);
    return parsed.language || 'de';
  }
  return 'de';
}
