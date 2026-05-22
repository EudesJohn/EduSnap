const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Clé service pour accès admin
);

/**
 * POST /api/moderate
 * Corps : { video_id: string }
 *
 * Workflow :
 * 1. Récupérer les métadonnées de la vidéo depuis Supabase
 * 2. Si pas de transcription : télécharger l'audio et appeler Whisper
 * 3. Alimenter GPT-4 avec la transcription pour évaluer le contenu
 * 4. Retourner un score et mettre à jour le statut dans Supabase
 */
router.post('/', async (req, res) => {
  const { video_id } = req.body;

  if (!video_id) {
    return res.status(400).json({ success: false, error: 'video_id requis' });
  }

  try {
    // ── ÉTAPE 1 : Récupérer la vidéo depuis Supabase ──
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*, subjects(name), profiles(username)')
      .eq('id', video_id)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable' });
    }

    console.log(`[MODÉRATION] Analyse de la vidéo "${video.title}" (ID: ${video_id})`);

    let transcription = video.transcription || null;

    // ── ÉTAPE 2 : Transcrire via Whisper si nécessaire ──
    if (!transcription && video.video_url) {
      console.log('[MODÉRATION] Téléchargement audio pour Whisper...');

      try {
        // Télécharger le fichier vidéo
        const videoResponse = await fetch(video.video_url);
        if (!videoResponse.ok) throw new Error('Impossible de télécharger la vidéo');

        const videoBuffer = await videoResponse.buffer();

        // Créer un fichier temporaire compatible avec l'API Whisper
        const { Readable } = require('stream');
        const audioStream = Readable.from(videoBuffer);
        audioStream.path = 'video.mp4'; // Whisper a besoin d'un nom de fichier

        // Appel Whisper
        const whisperResult = await openai.audio.transcriptions.create({
          file: audioStream,
          model: 'whisper-1',
          language: 'fr',
          response_format: 'text',
        });

        transcription = whisperResult;
        console.log(`[MODÉRATION] Transcription Whisper OK (${transcription.length} caractères)`);

        // Sauvegarder la transcription en BDD
        await supabase
          .from('videos')
          .update({ transcription })
          .eq('id', video_id);

      } catch (whisperError) {
        console.error('[MODÉRATION] Erreur Whisper:', whisperError.message);
        // Utiliser les métadonnées textuelles comme fallback
        transcription = `Titre: ${video.title}. Description: ${video.description || 'Non fournie'}. Matière: ${video.subjects?.name || 'Inconnue'}.`;
      }
    }

    // ── ÉTAPE 3 : Analyse GPT-4 ──
    console.log('[MODÉRATION] Analyse GPT-4 en cours...');

    const systemPrompt = `Tu es un modérateur IA pour EduSnap, une plateforme éducative pour lycéens et étudiants.
Tu dois évaluer si le contenu vidéo est approprié et éducatif.

Critères d'évaluation (note sur 100) :
- Contenu éducatif et pertinent pour la matière (40 points)
- Langage approprié et professionnel (25 points)
- Absence de contenu inapproprié, haineux ou dangereux (25 points)
- Qualité pédagogique générale (10 points)

Règles de décision :
- Score >= 80 : Approuver automatiquement (status: "approved")
- Score 50-79 : Envoyer en révision manuelle (status: "pending")
- Score < 50 : Rejeter automatiquement (status: "rejected")

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "score": <number 0-100>,
  "status": "<approved|pending|rejected>",
  "reason": "<explication courte en français>",
  "flags": ["<problème détecté si applicable>"],
  "educational_quality": "<excellent|bon|moyen|insuffisant>"
}`;

    const userPrompt = `Analyse ce contenu vidéo éducatif :

Titre: ${video.title}
Matière: ${video.subjects?.name || 'Non précisée'}
Difficulté: ${video.difficulty || 'Non précisée'}
Description: ${video.description || 'Aucune description'}
Transcription audio: ${transcription ? transcription.substring(0, 2000) : 'Aucune transcription disponible'}

Évalue si ce contenu est approprié pour une plateforme éducative destinée aux lycéens et étudiants.`;

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.3,
    });

    const analysisText = gptResponse.choices[0]?.message?.content;
    let analysis;

    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('[MODÉRATION] Erreur parsing JSON GPT:', parseError);
      // Fallback : score neutre
      analysis = {
        score: 65,
        status: 'pending',
        reason: 'Analyse incomplète — révision manuelle requise',
        flags: [],
        educational_quality: 'moyen',
      };
    }

    console.log(`[MODÉRATION] Score: ${analysis.score}/100 → Statut: ${analysis.status}`);

    // ── ÉTAPE 4 : Mettre à jour Supabase ──
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        status: analysis.status,
        ai_score: analysis.score,
      })
      .eq('id', video_id);

    if (updateError) {
      console.error('[MODÉRATION] Erreur mise à jour BDD:', updateError);
    }

    // Notifier le créateur du résultat
    await supabase.from('notifications').insert({
      user_id: video.creator_id,
      type: 'video_moderated',
      message: analysis.status === 'approved'
        ? `✅ Votre vidéo "${video.title}" a été approuvée ! (Score IA : ${analysis.score}/100)`
        : analysis.status === 'rejected'
        ? `❌ Votre vidéo "${video.title}" n'a pas été approuvée. (Score IA : ${analysis.score}/100) — ${analysis.reason}`
        : `⏳ Votre vidéo "${video.title}" est en cours de révision manuelle. (Score IA : ${analysis.score}/100)`,
    });

    return res.json({
      success: true,
      video_id,
      score: analysis.score,
      status: analysis.status,
      reason: analysis.reason,
      flags: analysis.flags || [],
      educational_quality: analysis.educational_quality,
    });

  } catch (error) {
    console.error('[MODÉRATION] Erreur critique:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la modération IA',
      details: error.message,
    });
  }
});

module.exports = router;
