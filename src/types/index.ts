// Types TypeScript pour EduSnap

export type AccountType = 'learner' | 'creator';
export type VideoDifficulty = 'Débutant' | 'Intermédiaire' | 'Avancé';
export type VideoStatus = 'pending' | 'approved' | 'rejected';
export type ReportReason = 'Pas éducatif' | 'Information incorrecte' | 'Contenu inapproprié' | 'Autre';
export type ReportStatus = 'pending' | 'resolved' | 'ignored';
export type NotificationType = 'like' | 'follow' | 'badge_earned' | 'video_approved' | 'video_rejected' | 'streak_danger' | 'system';

// Profil Utilisateur
export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  account_type: AccountType;
  xp_points: number;
  level: string; // 'Novice' | 'Apprenti' | 'Scholar' | 'Expert' | 'Master'
  streak_days: number;
  last_active_date: string | null;
  is_admin: boolean;
  created_at: string;
}

// Matière Scolaire
export interface Subject {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

// Matières Préférées de l'Utilisateur
export interface UserSubject {
  user_id: string;
  subject_id: number;
}

// Vidéo
export interface Video {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  subject_id: number | null;
  difficulty: VideoDifficulty;
  duration: number | null; // en secondes
  status: VideoStatus;
  ai_score: number | null;
  ai_reason: string | null;
  views_count: number;
  likes_count: number;
  created_at: string;
  // Propriétés peuplées par jointure Supabase
  profiles?: Profile;
  subjects?: Subject;
}

// Question de Quiz
export interface Question {
  id: string;
  video_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  correct_answer: 'a' | 'b' | 'c';
  explanation: string | null;
}

// Réponse soumise par l'utilisateur
export interface QuizAnswer {
  id: string;
  user_id: string;
  question_id: string;
  answer_given: 'a' | 'b' | 'c';
  is_correct: boolean;
  answered_at: string;
}

// Transaction XP
export interface XPTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

// Like sur une vidéo
export interface Like {
  user_id: string;
  video_id: string;
  created_at: string;
}

// Signalement
export interface Report {
  id: string;
  video_id: string;
  reporter_id: string;
  reason: ReportReason;
  status: ReportStatus;
  created_at: string;
}

// Abonnement (Follow)
export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

// Badge de Gamification
export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

// Badge gagné par un utilisateur
export interface UserBadge {
  user_id: string;
  badge_id: number;
  earned_at: string;
  badges?: Badge; // Jointure
}

// Parcours d'Apprentissage (Learning Path)
export interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  subject_id: number | null;
  difficulty: VideoDifficulty | null;
  created_by: string | null;
  created_at?: string;
  subjects?: Subject;
  profiles?: Profile;
}

// Vidéo dans un parcours
export interface PathVideo {
  path_id: string;
  video_id: string;
  order_index: number;
  videos?: Video; // Jointure
}

// Progression dans un parcours
export interface PathProgress {
  user_id: string;
  path_id: string;
  videos_completed: number;
  completed: boolean;
}

// Notification in-app
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
}

// État de l'authentification (Zustand Auth Store)
export interface AuthState {
  user: any | null; // Session Supabase user
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: any) => void;
  setProfile: (profile: Profile | null) => void;
  logout: () => Promise<void>;
}

// Classement (Leaderboard)
export interface LeaderboardItem {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  xp_points: number;
  level: string;
}
