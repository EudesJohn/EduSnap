const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Variables d'environnement manquantes : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── DATA ──────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { name: 'Mathématiques',    icon: 'calculator',    color: '#6366F1' },
  { name: 'Physique-Chimie',  icon: 'flask',         color: '#8B5CF6' },
  { name: 'SVT',              icon: 'leaf',          color: '#10B981' },
  { name: 'Histoire-Géo',    icon: 'globe',          color: '#F59E0B' },
  { name: 'Français',         icon: 'book',          color: '#EC4899' },
  { name: 'Philosophie',      icon: 'brain',         color: '#14B8A6' },
  { name: 'Anglais',          icon: 'language',      color: '#3B82F6' },
  { name: 'Informatique',     icon: 'laptop',        color: '#F97316' },
  { name: 'Économie',         icon: 'trending-up',   color: '#EAB308' },
  { name: 'Arts',             icon: 'palette',       color: '#A855F7' },
  { name: 'Sport',            icon: 'activity',      color: '#22C55E' },
  { name: 'Musique',          icon: 'music',         color: '#F43F5E' },
];

const BADGES = [
  {
    name: 'Premier Pas',
    description: 'Tu as regardé ta première vidéo éducative.',
    icon: '🐣',
    condition: 'first_video'
  },
  {
    name: 'Quiz Master',
    description: 'Tu as répondu correctement à 10 questions de quiz.',
    icon: '🧠',
    condition: 'correct_answers_10'
  },
  {
    name: 'Flamme 7 Jours',
    description: 'Tu as maintenu un streak de 7 jours consécutifs.',
    icon: '🔥',
    condition: 'streak_7'
  },
  {
    name: 'Flamme 30 Jours',
    description: 'Incroyable ! Streak de 30 jours consécutifs.',
    icon: '🌋',
    condition: 'streak_30'
  },
  {
    name: 'Novice+',
    description: 'Tu as atteint le niveau Étudiant (100 XP).',
    icon: '📚',
    condition: 'level_etudiant'
  },
  {
    name: 'Érudit',
    description: 'Tu as atteint le niveau Érudit (500 XP).',
    icon: '🎓',
    condition: 'level_erudit'
  },
  {
    name: 'Génie',
    description: 'Tu as franchi le cap des 1000 XP. Tes connaissances sont légendaires !',
    icon: '⚡',
    condition: 'level_genie'
  },
  {
    name: 'Perfectionniste',
    description: 'Tu as répondu correctement à 50 questions sans interruption.',
    icon: '💎',
    condition: 'correct_answers_50'
  },
  {
    name: 'Créateur',
    description: 'Tu as publié ta première vidéo éducative.',
    icon: '🎬',
    condition: 'first_video_published'
  },
  {
    name: 'Influenceur',
    description: 'Tes vidéos ont cumulé 1 000 vues.',
    icon: '🌟',
    condition: 'views_1000'
  },
  {
    name: 'Explorateur',
    description: 'Tu as terminé un parcours d\'apprentissage complet.',
    icon: '🗺️',
    condition: 'path_completed'
  },
  {
    name: 'Multidisciplinaire',
    description: 'Tu as regardé des vidéos dans 5 matières différentes.',
    icon: '🔬',
    condition: 'subjects_5'
  },
];

// ── SEED FUNCTIONS ─────────────────────────────────────────────────────────────

async function seedSubjects() {
  console.log('\n📚 Insertion des matières...');

  // Check if already seeded
  const { count } = await supabase
    .from('subjects')
    .select('*', { count: 'exact', head: true });

  if (count > 0) {
    console.log(`  ⏭️  ${count} matière(s) déjà présente(s). Skip.`);
    return;
  }

  const { data, error } = await supabase
    .from('subjects')
    .insert(SUBJECTS)
    .select();

  if (error) {
    console.error('  ❌ Erreur lors de l\'insertion des matières :', error.message);
  } else {
    console.log(`  ✅ ${data.length} matières insérées avec succès.`);
    data.forEach(s => console.log(`     • ${s.icon} ${s.name}`));
  }
}

async function seedBadges() {
  console.log('\n🏅 Insertion des badges...');

  const { count } = await supabase
    .from('badges')
    .select('*', { count: 'exact', head: true });

  if (count > 0) {
    console.log(`  ⏭️  ${count} badge(s) déjà présent(s). Skip.`);
    return;
  }

  const { data, error } = await supabase
    .from('badges')
    .insert(BADGES)
    .select();

  if (error) {
    console.error('  ❌ Erreur lors de l\'insertion des badges :', error.message);
  } else {
    console.log(`  ✅ ${data.length} badges insérés avec succès.`);
    data.forEach(b => console.log(`     • ${b.icon} ${b.name}`));
  }
}

// ── MAIN ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 EduSnap — Initialisation de la base de données');
  console.log('='.repeat(50));

  await seedSubjects();
  await seedBadges();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed terminé ! La base de données est prête.\n');
}

main().catch(err => {
  console.error('❌ Erreur critique :', err);
  process.exit(1);
});
