const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/generate-quiz
 * Corps : { title, description, subject, difficulty, transcription? }
 *
 * Génère une question QCM structurée via GPT-4 basée sur le contenu de la vidéo.
 * Retourne : { success, question: { question_text, option_a, option_b, option_c, correct_answer, explanation } }
 */
router.post('/', async (req, res) => {
  const { title, description, subject, difficulty, transcription } = req.body;

  if (!title || !subject) {
    return res.status(400).json({
      success: false,
      error: 'title et subject sont requis pour générer un quiz',
    });
  }

  try {
    console.log(`[QUIZ IA] Génération pour "${title}" (${subject} — ${difficulty || 'Débutant'})`);

    const systemPrompt = `Tu es un expert pédagogique spécialisé dans la création de QCM pour lycéens et étudiants.
Tu dois générer UNE question à choix multiple de haute qualité basée sur le contenu fourni.

Règles strictes :
1. La question doit tester la compréhension réelle du concept principal, pas la mémorisation simple
2. Les 3 options doivent être plausibles — les mauvaises réponses ne doivent pas être évidentes
3. L'explication doit être pédagogique et apprendre quelque chose de nouveau
4. Adapte la complexité au niveau : Débutant (simple), Intermédiaire (nuancé), Avancé (analytique)
5. Toujours en français

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "question_text": "<la question claire et précise>",
  "option_a": "<première option de réponse>",
  "option_b": "<deuxième option de réponse>",
  "option_c": "<troisième option de réponse>",
  "correct_answer": "<a, b ou c>",
  "explanation": "<explication pédagogique de 2-3 phrases expliquant pourquoi c'est la bonne réponse>"
}`;

    const contentSummary = transcription
      ? `Transcription : ${transcription.substring(0, 1500)}`
      : `Titre : ${title}\nDescription : ${description || 'Non fournie'}`;

    const userPrompt = `Génère une question QCM de niveau "${difficulty || 'Débutant'}" pour la matière "${subject}".

Contenu de la vidéo :
${contentSummary}

La question doit tester la compréhension du concept principal abordé dans ce cours.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.7,
    });

    const questionText = response.choices[0]?.message?.content;

    let question;
    try {
      question = JSON.parse(questionText);
    } catch (parseError) {
      console.error('[QUIZ IA] Erreur parsing JSON:', parseError);
      // Fallback structuré basé sur les métadonnées
      question = {
        question_text: `Quel est le concept fondamental abordé dans ce cours de ${subject} sur "${title}" ?`,
        option_a: 'La maîtrise des fondamentaux théoriques et leur application pratique',
        option_b: "L'expérimentation empirique sans cadre théorique préalable",
        option_c: 'La mémorisation passive des définitions sans compréhension',
        correct_answer: 'a',
        explanation: `Dans ce cours de ${subject}, la compréhension profonde des concepts théoriques est essentielle avant toute application. La maîtrise des fondamentaux permet d'aborder des problèmes complexes avec méthode.`,
      };
    }

    // Validation de la structure retournée
    const requiredFields = ['question_text', 'option_a', 'option_b', 'option_c', 'correct_answer', 'explanation'];
    const missingFields = requiredFields.filter((f) => !question[f]);

    if (missingFields.length > 0) {
      console.warn('[QUIZ IA] Champs manquants:', missingFields);
      return res.status(422).json({
        success: false,
        error: 'La réponse IA est incomplète',
        missing: missingFields,
      });
    }

    // Valider que correct_answer est bien 'a', 'b' ou 'c'
    if (!['a', 'b', 'c'].includes(question.correct_answer)) {
      question.correct_answer = 'a';
    }

    console.log(`[QUIZ IA] Question générée avec succès (réponse : ${question.correct_answer})`);

    return res.json({
      success: true,
      question,
      model_used: response.model,
      tokens_used: response.usage?.total_tokens,
    });

  } catch (error) {
    console.error('[QUIZ IA] Erreur critique:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du quiz IA',
      details: error.message,
    });
  }
});

module.exports = router;
