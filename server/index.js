require('dotenv').config();
const express = require('express');
const cors = require('cors');

const moderateRouter = require('./routes/moderate');
const generateQuizRouter = require('./routes/generateQuiz');

const app = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ──
app.use(cors({ origin: '*' })); // En prod, restreindre à l'origine Expo
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── LOG DES REQUÊTES (debug) ──
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ── ROUTES ──
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'EduSnap IA Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/moderate', moderateRouter);
app.use('/api/generate-quiz', generateQuizRouter);

// ── GESTION DES ERREURS GLOBALE ──
app.use((err, _req, res, _next) => {
  console.error('[ERREUR SERVEUR]', err.stack);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur IA',
    message: err.message,
  });
});

// Route inconnue
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route non trouvée' });
});

// ── DÉMARRAGE ──
app.listen(PORT, () => {
  console.log(`\n🚀 EduSnap IA Server démarré sur le port ${PORT}`);
  console.log(`   Health check : http://localhost:${PORT}/health`);
  console.log(`   Modération   : POST http://localhost:${PORT}/api/moderate`);
  console.log(`   Génération   : POST http://localhost:${PORT}/api/generate-quiz\n`);
});
