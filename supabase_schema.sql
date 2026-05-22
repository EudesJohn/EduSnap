-- ==========================================
-- EDUSNAP - SQL SCHEMA, TRIGGERS & RLS SETUP
-- ==========================================

-- Désactiver les triggers temporairement pour éviter des problèmes lors de la configuration
SET session_replication_role = 'replica';

-- ------------------------------------------
-- 1. NETTOYAGE DES TABLES EXISTANTES SI EXISTENT
-- ------------------------------------------
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.path_progress CASCADE;
DROP TABLE IF EXISTS public.path_videos CASCADE;
DROP TABLE IF EXISTS public.learning_paths CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.xp_transactions CASCADE;
DROP TABLE IF EXISTS public.quiz_answers CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.user_subjects CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

SET session_replication_role = 'origin';

-- ------------------------------------------
-- 2. CRÉATION DES TABLES
-- ------------------------------------------

-- Table Profils (Extension d'auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  account_type TEXT DEFAULT 'learner' CHECK (account_type IN ('learner', 'creator')),
  xp_points INTEGER DEFAULT 0,
  level TEXT DEFAULT 'Novice',
  streak_days INTEGER DEFAULT 0,
  last_active_date DATE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table Matières
CREATE TABLE public.subjects (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT, -- Ex: 'calculator', 'book', 'globe'
  color TEXT  -- Ex: '#4F46E5', '#EF4444'
);

-- Table de jointure Matières Préférées des Utilisateurs
CREATE TABLE public.user_subjects (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES public.subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, subject_id)
);

-- Table Vidéos
CREATE TABLE public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  subject_id INTEGER REFERENCES public.subjects(id) ON DELETE SET NULL,
  difficulty TEXT CHECK (difficulty IN ('Débutant', 'Intermédiaire', 'Avancé')),
  duration INTEGER, -- En secondes
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ai_score INTEGER, -- Score modération de 0 à 100
  ai_reason TEXT,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table Questions Quiz
CREATE TABLE public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  correct_answer TEXT CHECK (correct_answer IN ('a', 'b', 'c')) NOT NULL,
  explanation TEXT
);

-- Table Réponses aux Quiz
CREATE TABLE public.quiz_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  answer_given TEXT CHECK (answer_given IN ('a', 'b', 'c')),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP DEFAULT NOW()
);

-- Table Transactions XP
CREATE TABLE public.xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table Likes
CREATE TABLE public.likes (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, video_id)
);

-- Table Signalements
CREATE TABLE public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('Pas éducatif', 'Information incorrecte', 'Contenu inapproprié', 'Autre')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table Abonnements (Follows)
CREATE TABLE public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Table Badges
CREATE TABLE public.badges (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Nom d'icône Ionicons ou emoji
  condition TEXT NOT NULL
);

-- Table Badges Utilisateurs
CREATE TABLE public.user_badges (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id INTEGER REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- Table Parcours d'Apprentissage
CREATE TABLE public.learning_paths (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id INTEGER REFERENCES public.subjects(id) ON DELETE SET NULL,
  difficulty TEXT CHECK (difficulty IN ('Débutant', 'Intermédiaire', 'Avancé')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table Vidéos dans les Parcours
CREATE TABLE public.path_videos (
  path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (path_id, video_id)
);

-- Table Progression dans les Parcours
CREATE TABLE public.path_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
  videos_completed INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, path_id)
);

-- Table Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'like', 'follow', 'badge_earned', 'video_approved', 'video_rejected', 'streak_danger', 'system'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------
-- 3. CRÉATION DES INDEX POUR OPTIMISATION DU FEED
-- ------------------------------------------
CREATE INDEX idx_videos_status ON public.videos(status) WHERE status = 'approved';
CREATE INDEX idx_videos_subject ON public.videos(subject_id);
CREATE INDEX idx_quiz_answers_user ON public.quiz_answers(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- ------------------------------------------
-- 4. CONFIGURATION DU ROW LEVEL SECURITY (RLS)
-- ------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- 5. POLITIQUES RLS (POLICIES)
-- ------------------------------------------

-- PROFILES
CREATE POLICY "Lecture publique des profils" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Mise à jour de son propre profil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- SUBJECTS
CREATE POLICY "Lecture publique des matières" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admin modification matières" ON public.subjects FOR ALL USING (
  coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);

-- USER_SUBJECTS
CREATE POLICY "Lecture de ses propres matières préférées" ON public.user_subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Modification de ses propres matières préférées" ON public.user_subjects FOR ALL USING (auth.uid() = user_id);

-- VIDEOS
CREATE POLICY "Lecture des vidéos approuvées ou de ses propres vidéos" ON public.videos FOR SELECT USING (
  status = 'approved' OR creator_id = auth.uid() OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);
CREATE POLICY "Insertion de ses propres vidéos pour créateur" ON public.videos FOR INSERT WITH CHECK (
  auth.uid() = creator_id AND (SELECT account_type FROM public.profiles WHERE id = auth.uid()) = 'creator'
);
CREATE POLICY "Mise à jour de ses propres vidéos ou admin" ON public.videos FOR UPDATE USING (
  auth.uid() = creator_id OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);
CREATE POLICY "Suppression de ses propres vidéos ou admin" ON public.videos FOR DELETE USING (
  auth.uid() = creator_id OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);

-- QUESTIONS
CREATE POLICY "Lecture des questions des vidéos visibles" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos WHERE id = video_id)
);
CREATE POLICY "Gestion des questions par le créateur ou admin" ON public.questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos WHERE id = video_id AND creator_id = auth.uid()) OR
  coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);

-- QUIZ_ANSWERS
CREATE POLICY "Lecture de ses propres réponses de quiz ou admin" ON public.quiz_answers FOR SELECT USING (
  auth.uid() = user_id OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);
CREATE POLICY "Insertion de ses propres réponses de quiz" ON public.quiz_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- XP_TRANSACTIONS
CREATE POLICY "Lecture de ses propres transactions XP" ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id);

-- LIKES
CREATE POLICY "Lecture publique des likes" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Ajout de likes par utilisateur authentifié" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Suppression de ses propres likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- REPORTS
CREATE POLICY "Ajout de signalements par utilisateur authentifié" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Lecture de ses propres signalements ou admin" ON public.reports FOR SELECT USING (
  auth.uid() = reporter_id OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);
CREATE POLICY "Gestion des signalements par admin" ON public.reports FOR ALL USING (
  coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);

-- FOLLOWS
CREATE POLICY "Lecture publique des follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Suivre quelqu'un" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Ne plus suivre quelqu'un" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- BADGES
CREATE POLICY "Lecture publique des badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Gestion des badges par admin" ON public.badges FOR ALL USING (
  coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);

-- USER_BADGES
CREATE POLICY "Lecture publique des badges gagnés" ON public.user_badges FOR SELECT USING (true);

-- LEARNING_PATHS
CREATE POLICY "Lecture publique des parcours" ON public.learning_paths FOR SELECT USING (true);
CREATE POLICY "Création de parcours pour créateur ou admin" ON public.learning_paths FOR INSERT WITH CHECK (
  auth.uid() = created_by OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);
CREATE POLICY "Mise à jour parcours par créateur ou admin" ON public.learning_paths FOR UPDATE USING (
  auth.uid() = created_by OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);
CREATE POLICY "Suppression parcours par créateur ou admin" ON public.learning_paths FOR DELETE USING (
  auth.uid() = created_by OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
);

-- PATH_VIDEOS
CREATE POLICY "Lecture publique des vidéos de parcours" ON public.path_videos FOR SELECT USING (true);
CREATE POLICY "Gestion des vidéos de parcours par créateur ou admin" ON public.path_videos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.learning_paths WHERE id = path_id AND (created_by = auth.uid() OR coalesce((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)))
);

-- PATH_PROGRESS
CREATE POLICY "Gestion de sa progression par l'utilisateur" ON public.path_progress FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Lecture de ses propres notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Mise à jour / suppression de ses propres notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);


-- ------------------------------------------
-- 6. FONCTIONS ET TRIGGERS PL/pgSQL
-- ------------------------------------------

-- A. CRÉATION DU PROFIL AUTOMATIQUE APRÈS SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
BEGIN
  default_username := coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8));
  
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    bio,
    account_type,
    xp_points,
    level,
    streak_days,
    last_active_date,
    is_admin
  )
  VALUES (
    new.id,
    default_username,
    coalesce(new.raw_user_meta_data->>'full_name', default_username),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'bio', ''),
    coalesce(new.raw_user_meta_data->>'account_type', 'learner'),
    0,
    'Novice',
    0,
    NULL,
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false)
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- B. FONCTION SÉCURISÉE DE GESTION DE L'XP, DES NIVEAUX ET DES STREAKS (RPC PRINCIPAL)
CREATE OR REPLACE FUNCTION public.add_user_xp(
  p_user_id UUID,
  p_xp_to_add INTEGER,
  p_xp_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_current_xp INTEGER;
  v_new_xp INTEGER;
  v_new_level TEXT;
  v_streak_changed BOOLEAN := false;
  v_current_streak INTEGER;
  v_last_active DATE;
  v_result JSON;
BEGIN
  -- 1. Récupération des infos actuelles du profil
  SELECT xp_points, streak_days, last_active_date INTO v_current_xp, v_current_streak, v_last_active
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Utilisateur non trouvé');
  END IF;

  -- 2. Calcul du nouvel XP (ne peut pas descendre en dessous de 0)
  v_new_xp := greatest(0, v_current_xp + p_xp_to_add);

  -- 3. Détermination du niveau
  -- Novice: 0-100, Apprenti: 101-300, Scholar: 301-700, Expert: 701-1500, Master: 1500+
  IF v_new_xp <= 100 THEN
    v_new_level := 'Novice';
  ELSIF v_new_xp <= 300 THEN
    v_new_level := 'Apprenti';
  ELSIF v_new_xp <= 700 THEN
    v_new_level := 'Scholar';
  ELSIF v_new_xp <= 1500 THEN
    v_new_level := 'Expert';
  ELSE
    v_new_level := 'Master';
  END IF;

  -- 4. Calcul de la série d'activité (Streaks)
  IF v_last_active IS NULL THEN
    v_current_streak := 1;
    v_streak_changed := true;
  ELSIF v_last_active = current_date THEN
    -- Déjà actif aujourd'hui, pas de changement
    v_streak_changed := false;
  ELSIF v_last_active = current_date - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
    v_streak_changed := true;
    
    -- Bonus XP double tous les 7 jours de streak (+20 XP additionnel)
    IF v_current_streak % 7 = 0 THEN
      v_new_xp := v_new_xp + 20;
      INSERT INTO public.xp_transactions (user_id, amount, reason)
      VALUES (p_user_id, 20, 'Bonus de série (Streak ' || v_current_streak || ' jours) (+20 XP)');
    END IF;
  ELSE
    -- Streak interrompu, on recommence à 1
    v_current_streak := 1;
    v_streak_changed := true;
  END IF;

  -- 5. Mise à jour de la table Profiles
  UPDATE public.profiles
  SET xp_points = v_new_xp,
      level = v_new_level,
      streak_days = v_current_streak,
      last_active_date = current_date
  WHERE id = p_user_id;

  -- 6. Enregistrement de la transaction XP
  INSERT INTO public.xp_transactions (user_id, amount, reason)
  VALUES (p_user_id, p_xp_to_add, p_xp_reason);

  -- 7. Retourner le statut
  v_result := json_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'new_level', v_new_level,
    'streak_days', v_current_streak,
    'streak_changed', v_streak_changed
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- C. COMPTEUR DE LIKES EN TEMPS RÉEL SUR LES VIDÉOS
CREATE OR REPLACE FUNCTION public.handle_video_like()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    
    -- Notification automatique au créateur
    INSERT INTO public.notifications (user_id, type, message)
    SELECT 
      v.creator_id, 
      'like', 
      p.username || ' a aimé votre vidéo "' || v.title || '".'
    FROM public.videos v
    JOIN public.profiles p ON p.id = NEW.user_id
    WHERE v.id = NEW.video_id AND v.creator_id <> NEW.user_id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos SET likes_count = greatest(0, likes_count - 1) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_video_like
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_video_like();


-- D. SUSPENSION AUTOMATIQUE DU CONTENU EN CAS DE 10 SIGNALEMENTS
CREATE OR REPLACE FUNCTION public.handle_video_report()
RETURNS TRIGGER AS $$
DECLARE
  v_report_count INTEGER;
  v_creator_id UUID;
  v_title TEXT;
BEGIN
  -- Calcul du nombre de signalements
  SELECT count(*) INTO v_report_count
  FROM public.reports
  WHERE video_id = NEW.video_id AND status = 'pending';

  -- Récupération du créateur et du titre
  SELECT creator_id, title INTO v_creator_id, v_title
  FROM public.videos
  WHERE id = NEW.video_id;

  -- Suspension automatique si le seuil de 10 signalements est atteint
  IF v_report_count >= 10 THEN
    UPDATE public.videos
    SET status = 'rejected',
        ai_reason = '[AUTOMATIQUE] Suspendu après 10 signalements d''utilisateurs.'
    WHERE id = NEW.video_id;

    -- Notification au créateur
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
      v_creator_id,
      'video_rejected',
      'Votre vidéo "' || v_title || '" a été suspendue automatiquement suite à de multiples signalements (10+).'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_video_report
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_video_report();


-- E. ATTRIBUTION DYNAMIQUE ET SÉCURISÉE DES BADGES
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_correct_count INTEGER;
  v_math_count INTEGER;
  v_science_count INTEGER;
  v_hist_count INTEGER;
  v_lang_count INTEGER;
  v_philo_count INTEGER;
  v_approved_videos INTEGER;
  v_xp INTEGER;
  v_streak INTEGER;
  v_badge_id INTEGER;
BEGIN
  -- A. Trigger provenant de PROFILES
  IF TG_TABLE_NAME = 'profiles' THEN
    v_user_id := NEW.id;
    v_xp := NEW.xp_points;
    v_streak := NEW.streak_days;

    -- Badge 2 : Semaine de feu (7 jours de streak)
    IF v_streak >= 7 THEN
      SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Semaine de feu';
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- Badge 9 : Mentor (Niveau Scholar ou plus, soit 301+ XP)
    IF v_xp >= 301 THEN
      SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Mentor';
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    -- Badge 10 : Sage d'EduSnap (Niveau Master ou plus, soit 1500+ XP)
    IF v_xp >= 1500 THEN
      SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Sage d''EduSnap';
      IF v_badge_id IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

  -- B. Trigger provenant de QUIZ_ANSWERS
  ELSIF TG_TABLE_NAME = 'quiz_answers' THEN
    IF NEW.is_correct = true THEN
      v_user_id := NEW.user_id;

      -- Badge 1 : Premier Quiz (1er quiz réussi)
      SELECT count(*) INTO v_correct_count FROM public.quiz_answers WHERE user_id = v_user_id AND is_correct = true;
      IF v_correct_count >= 1 THEN
        SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Premier Quiz';
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      -- Badge 3 : Mathématicien (50 quiz de maths)
      SELECT count(*) INTO v_math_count
      FROM public.quiz_answers qa
      JOIN public.questions q ON qa.question_id = q.id
      JOIN public.videos v ON q.video_id = v.id
      JOIN public.subjects s ON v.subject_id = s.id
      WHERE qa.user_id = v_user_id AND qa.is_correct = true AND s.name = 'Mathématiques';

      IF v_math_count >= 50 THEN
        SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Mathématicien';
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      -- Badge 4 : Scientifique (50 quiz SVT / Physique / Chimie)
      SELECT count(*) INTO v_science_count
      FROM public.quiz_answers qa
      JOIN public.questions q ON qa.question_id = q.id
      JOIN public.videos v ON q.video_id = v.id
      JOIN public.subjects s ON v.subject_id = s.id
      WHERE qa.user_id = v_user_id AND qa.is_correct = true AND s.name IN ('Physique-Chimie', 'SVT');

      IF v_science_count >= 50 THEN
        SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Scientifique';
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      -- Badge 5 : Historien (20 quiz d'histoire-géo)
      SELECT count(*) INTO v_hist_count
      FROM public.quiz_answers qa
      JOIN public.questions q ON qa.question_id = q.id
      JOIN public.videos v ON q.video_id = v.id
      JOIN public.subjects s ON v.subject_id = s.id
      WHERE qa.user_id = v_user_id AND qa.is_correct = true AND s.name = 'Histoire-Géographie';

      IF v_hist_count >= 20 THEN
        SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Historien';
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      -- Badge 6 : Polyglotte (20 quiz d'Anglais / Français)
      SELECT count(*) INTO v_lang_count
      FROM public.quiz_answers qa
      JOIN public.questions q ON qa.question_id = q.id
      JOIN public.videos v ON q.video_id = v.id
      JOIN public.subjects s ON v.subject_id = s.id
      WHERE qa.user_id = v_user_id AND qa.is_correct = true AND s.name IN ('Anglais', 'Français');

      IF v_lang_count >= 20 THEN
        SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Polyglotte';
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;

      -- Badge 7 : Philosophe (10 quiz de philosophie)
      SELECT count(*) INTO v_philo_count
      FROM public.quiz_answers qa
      JOIN public.questions q ON qa.question_id = q.id
      JOIN public.videos v ON q.video_id = v.id
      JOIN public.subjects s ON v.subject_id = s.id
      WHERE qa.user_id = v_user_id AND qa.is_correct = true AND s.name = 'Philosophie';

      IF v_philo_count >= 10 THEN
        SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Philosophe';
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;

  -- C. Trigger provenant de VIDEOS
  ELSIF TG_TABLE_NAME = 'videos' THEN
    -- Badge 8 : Créateur (1ère vidéo approuvée en ligne)
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
      v_user_id := NEW.creator_id;
      
      SELECT count(*) INTO v_approved_videos FROM public.videos WHERE creator_id = v_user_id AND status = 'approved';
      IF v_approved_videos >= 1 THEN
        SELECT id INTO v_badge_id FROM public.badges WHERE name = 'Créateur';
        IF v_badge_id IS NOT NULL THEN
          INSERT INTO public.user_badges (user_id, badge_id) VALUES (v_user_id, v_badge_id) ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencheurs de Badges
CREATE OR REPLACE TRIGGER on_profile_badge_check
  AFTER UPDATE OF xp_points, streak_days ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_and_award_badges();

CREATE OR REPLACE TRIGGER on_quiz_badge_check
  AFTER INSERT ON public.quiz_answers
  FOR EACH ROW EXECUTE FUNCTION public.check_and_award_badges();

CREATE OR REPLACE TRIGGER on_video_badge_check
  AFTER UPDATE OF status ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.check_and_award_badges();


-- F. NOTIFICATION DE CRÉATION DE BADGE
CREATE OR REPLACE FUNCTION public.handle_new_badge_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_badge_name TEXT;
BEGIN
  SELECT name INTO v_badge_name FROM public.badges WHERE id = NEW.badge_id;
  
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (
    NEW.user_id,
    'badge_earned',
    'Félicitations ! 🏅 Vous avez débloqué le badge "' || v_badge_name || '" !'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_badge_earned
  AFTER INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_badge_notification();


-- ------------------------------------------
-- 7. SEEDING INITIAL DES DONNÉES (MATIÈRES ET 10 BADGES)
-- ------------------------------------------

-- A. Insertion des matières scolaires standard
INSERT INTO public.subjects (id, name, icon, color) VALUES
  (1, 'Mathématiques', 'calculator-outline', '#4F46E5'),  -- Indigo
  (2, 'Physique-Chimie', 'beaker-outline', '#EF4444'),    -- Rouge
  (3, 'SVT', 'leaf-outline', '#10B981'),                 -- Vert
  (4, 'Histoire-Géographie', 'globe-outline', '#F59E0B'), -- Orange
  (5, 'Philosophie', 'brain', '#8B5CF6'),                 -- Violet
  (6, 'Français', 'book-outline', '#EC4899'),             -- Rose
  (7, 'Anglais', 'chatbubbles-outline', '#06B6D4'),       -- Cyan
  (8, 'Informatique', 'code-slash-outline', '#3B82F6')    -- Bleu
ON CONFLICT (name) DO NOTHING;

-- B. Insertion des 10 badges officiels
INSERT INTO public.badges (id, name, description, icon, condition) VALUES
  (1, 'Premier Quiz', 'Réussir votre tout premier quiz éducatif', 'rocket', 'correct_quiz_answers >= 1'),
  (2, 'Semaine de feu', 'Maintenir une série de 7 jours consécutifs d''apprentissage', 'flame', 'streak_days >= 7'),
  (3, 'Mathématicien', 'Réussir 50 quiz en Mathématiques', 'calculator', 'math_quiz_correct >= 50'),
  (4, 'Scientifique', 'Réussir 50 quiz en SVT ou Physique-Chimie', 'beaker', 'science_quiz_correct >= 50'),
  (5, 'Historien', 'Réussir 20 quiz d''Histoire-Géographie', 'globe', 'history_quiz_correct >= 20'),
  (6, 'Polyglotte', 'Réussir 20 quiz de Français ou d''Anglais', 'chatbubbles', 'languages_quiz_correct >= 20'),
  (7, 'Philosophe', 'Réussir 10 quiz de Philosophie', 'bulb', 'philosophy_quiz_correct >= 10'),
  (8, 'Créateur', 'Publier votre première vidéo validée par l''équipe', 'videocam', 'approved_videos >= 1'),
  (9, 'Mentor', 'Atteindre le niveau Scholar (301+ XP)', 'ribbon', 'xp_points >= 301'),
  (10, 'Sage d''EduSnap', 'Atteindre le niveau Master (1500+ XP)', 'trophy', 'xp_points >= 1500')
ON CONFLICT (name) DO NOTHING;


-- ------------------------------------------
-- 8. INITIALISATION DES BUCKETS DE STOCKAGE SUPABASE
-- ------------------------------------------
-- Ces requêtes insèrent la configuration des buckets directement si la table storage.buckets existe (généralement gérée par Supabase)
-- Note : Elles requièrent des privilèges élevés qui sont standards sur l'éditeur SQL de Supabase.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/quicktime', 'video/mkv']),
  ('thumbnails', 'thumbnails', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Configuration des politiques RLS pour l'accès aux buckets de stockage
CREATE POLICY "Accès public en lecture aux avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload de son propre avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Accès public en lecture aux vidéos" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Upload de vidéos par créateurs authentifiés" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND auth.role() = 'authenticated'
);

CREATE POLICY "Accès public en lecture aux vignettes" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Upload de vignettes par créateurs authentifiés" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' AND auth.role() = 'authenticated'
);
