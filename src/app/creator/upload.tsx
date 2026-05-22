import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Types de difficulté EduSnap
const DIFFICULTY_OPTIONS = ['Débutant', 'Intermédiaire', 'Avancé'];

interface QuizQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  correct_answer: 'a' | 'b' | 'c';
  explanation: string;
}

const EMPTY_QUIZ: QuizQuestion = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  correct_answer: 'a',
  explanation: '',
};

export default function UploadScreen() {
  const { user } = useAuthStore();

  // Formulaire vidéo
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<{ id: number; name: string } | null>(null);
  const [difficulty, setDifficulty] = useState('Débutant');
  const [tags, setTags] = useState('');
  const [videoFile, setVideoFile] = useState<any>(null);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);

  // Quiz
  const [useCustomQuiz, setUseCustomQuiz] = useState(true);
  const [quiz, setQuiz] = useState<QuizQuestion>({ ...EMPTY_QUIZ });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // État global upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'video' | 'quiz' | 'done'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Étapes du formulaire (multi-page)
  const [currentStep, setCurrentStep] = useState(0); // 0 = infos, 1 = quiz, 2 = review

  // Charger les matières au montage
  React.useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('id, name').order('name');
      setSubjects(data || []);
    };
    fetchSubjects();
  }, []);

  // 1. Sélectionner un fichier vidéo
  const handlePickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setVideoFile(result.assets[0]);
      }
    } catch (e) {
      console.error('Erreur lors de la sélection vidéo:', e);
    }
  };

  // 2. Générer un quiz IA via le serveur Express
  const handleGenerateAIQuiz = async () => {
    if (!title || !selectedSubject) {
      Alert.alert('Informations manquantes', 'Remplissez le titre et sélectionnez une matière pour générer un quiz IA.');
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Appel au mini-serveur Express de modération IA
      const response = await fetch('http://localhost:3001/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          subject: selectedSubject.name,
          difficulty,
        }),
      });

      if (!response.ok) throw new Error(`Serveur IA indisponible (${response.status})`);

      const data = await response.json();
      if (data.success && data.question) {
        setQuiz(data.question);
        Alert.alert('✅ Quiz généré', 'L\'IA a créé une question basée sur votre vidéo. Vérifiez et ajustez si nécessaire.');
      }
    } catch (e: any) {
      console.error('Erreur IA quiz:', e);
      Alert.alert('Serveur IA indisponible', 'Le serveur de génération de quiz n\'est pas accessible. Saisissez votre quiz manuellement.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 3. Upload complet : vidéo → Supabase Storage → BDD
  const handleSubmit = async () => {
    // Validations
    if (!title.trim()) return Alert.alert('Titre manquant', 'Ajoutez un titre à votre cours.');
    if (!selectedSubject) return Alert.alert('Matière manquante', 'Sélectionnez la matière de la vidéo.');
    if (!videoFile) return Alert.alert('Vidéo manquante', 'Sélectionnez un fichier vidéo à publier.');

    // Validation quiz
    if (useCustomQuiz) {
      if (!quiz.question_text.trim() || !quiz.option_a.trim() || !quiz.option_b.trim() || !quiz.option_c.trim()) {
        return Alert.alert('Quiz incomplet', 'Remplissez toutes les options de la question ou passez à la génération IA.');
      }
    }

    setIsUploading(true);

    try {
      // ── ÉTAPE 1 : Upload de la vidéo vers Supabase Storage ──
      setUploadStep('video');
      setUploadProgress(0.1);

      const videoExtension = videoFile.name?.split('.').pop() || 'mp4';
      const videoPath = `${user!.id}/${Date.now()}.${videoExtension}`;

      // Lire le fichier comme ArrayBuffer pour l'upload
      const videoBlob = await (await fetch(videoFile.uri)).blob();

      const { error: storageError } = await supabase.storage
        .from('videos')
        .upload(videoPath, videoBlob, {
          contentType: videoFile.mimeType || 'video/mp4',
          upsert: false,
        });

      if (storageError) throw new Error(`Erreur upload vidéo: ${storageError.message}`);

      setUploadProgress(0.5);

      // Obtenir l'URL publique de la vidéo
      const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(videoPath);
      const videoUrl = publicUrlData.publicUrl;

      // ── ÉTAPE 2 : Insérer la vidéo en BDD ──
      setUploadStep('quiz');
      setUploadProgress(0.7);

      const { data: videoRecord, error: videoDbError } = await supabase
        .from('videos')
        .insert({
          creator_id: user!.id,
          title: title.trim(),
          description: description.trim(),
          video_url: videoUrl,
          subject_id: selectedSubject.id,
          difficulty,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          status: 'pending', // Nécessite modération
          ai_score: null,
          views_count: 0,
          likes_count: 0,
        })
        .select()
        .single();

      if (videoDbError) throw new Error(`Erreur BDD vidéo: ${videoDbError.message}`);

      // ── ÉTAPE 3 : Insérer la question de quiz si fournie ──
      if (useCustomQuiz && quiz.question_text.trim()) {
        const { error: quizError } = await supabase.from('questions').insert({
          video_id: videoRecord.id,
          question_text: quiz.question_text.trim(),
          option_a: quiz.option_a.trim(),
          option_b: quiz.option_b.trim(),
          option_c: quiz.option_c.trim(),
          correct_answer: quiz.correct_answer,
          explanation: quiz.explanation.trim(),
        });

        if (quizError) console.error('Erreur insertion quiz:', quizError);
      }

      setUploadProgress(1.0);
      setUploadStep('done');

      // ── SUCCÈS ──
      Alert.alert(
        '🎉 Vidéo publiée !',
        'Votre cours a été envoyé à la modération IA. Il sera visible après validation (généralement sous 24h).',
        [{ text: 'Voir mon tableau de bord', onPress: () => router.replace('/creator/dashboard') }]
      );
    } catch (e: any) {
      console.error('Erreur lors de la publication:', e);
      Alert.alert('Erreur de publication', e.message || 'Une erreur est survenue. Réessayez.');
    } finally {
      setIsUploading(false);
      setUploadStep('idle');
    }
  };

  // ── RENDU DES ÉTAPES ──
  const renderStep0 = () => (
    <View>
      {/* Titre */}
      <Text style={inputLabel}>Titre du cours *</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Ex : Introduction à la dérivation en Terminale"
        placeholderTextColor="#475569"
        style={inputStyle}
        maxLength={100}
      />

      {/* Description */}
      <Text style={inputLabel}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Résumez le contenu de votre cours..."
        placeholderTextColor="#475569"
        style={[inputStyle, { height: 90, textAlignVertical: 'top' }]}
        multiline
        maxLength={500}
      />

      {/* Sélection matière */}
      <Text style={inputLabel}>Matière *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              onPress={() => setSelectedSubject(subject)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: selectedSubject?.id === subject.id ? '#818CF8' : 'rgba(255,255,255,0.1)',
                backgroundColor: selectedSubject?.id === subject.id ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <Text style={{
                color: selectedSubject?.id === subject.id ? '#818CF8' : '#94A3B8',
                fontWeight: '700',
                fontSize: 12,
              }}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Difficulté */}
      <Text style={inputLabel}>Niveau de difficulté</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {DIFFICULTY_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDifficulty(d)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: difficulty === d ? '#38BDF8' : 'rgba(255,255,255,0.1)',
              backgroundColor: difficulty === d ? 'rgba(56,189,248,0.1)' : 'transparent',
            }}
          >
            <Text style={{ color: difficulty === d ? '#38BDF8' : '#64748B', fontSize: 12, fontWeight: '700' }}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tags */}
      <Text style={inputLabel}>Tags (séparés par des virgules)</Text>
      <TextInput
        value={tags}
        onChangeText={setTags}
        placeholder="mathématiques, dérivation, lycée..."
        placeholderTextColor="#475569"
        style={inputStyle}
      />

      {/* Sélection vidéo */}
      <Text style={inputLabel}>Fichier vidéo *</Text>
      <TouchableOpacity
        onPress={handlePickVideo}
        style={{
          height: 100,
          borderRadius: 16,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: videoFile ? '#818CF8' : 'rgba(255,255,255,0.15)',
          backgroundColor: videoFile ? 'rgba(129,140,248,0.08)' : 'rgba(255,255,255,0.03)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Ionicons
          name={videoFile ? 'checkmark-circle' : 'cloud-upload-outline'}
          size={32}
          color={videoFile ? '#818CF8' : '#475569'}
        />
        <Text style={{ color: videoFile ? '#818CF8' : '#64748B', fontSize: 13, fontWeight: '700', marginTop: 6 }}>
          {videoFile ? videoFile.name || 'Vidéo sélectionnée ✓' : 'Appuyer pour choisir une vidéo'}
        </Text>
        {videoFile && (
          <Text style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
            {videoFile.mimeType || 'video'} · {Math.round((videoFile.size || 0) / 1024 / 1024)}MB
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStep1 = () => (
    <View>
      {/* Toggle Quiz */}
      <Text style={[inputLabel, { marginBottom: 12 }]}>Question de quiz après la vidéo</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <TouchableOpacity
          onPress={() => setUseCustomQuiz(true)}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: useCustomQuiz ? '#818CF8' : 'rgba(255,255,255,0.1)',
            backgroundColor: useCustomQuiz ? 'rgba(129,140,248,0.1)' : 'transparent',
          }}
        >
          <Ionicons name="create-outline" size={20} color={useCustomQuiz ? '#818CF8' : '#475569'} />
          <Text style={{ color: useCustomQuiz ? '#818CF8' : '#64748B', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
            Rédiger manuellement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleGenerateAIQuiz}
          disabled={isGeneratingAI}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16,185,129,0.08)',
          }}
        >
          {isGeneratingAI ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Ionicons name="sparkles-outline" size={20} color="#10B981" />
          )}
          <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
            {isGeneratingAI ? 'Génération IA...' : 'Générer avec l\'IA'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Champs quiz */}
      <Text style={inputLabel}>Question *</Text>
      <TextInput
        value={quiz.question_text}
        onChangeText={(t) => setQuiz((q) => ({ ...q, question_text: t }))}
        placeholder="Posez une question sur le contenu de la vidéo..."
        placeholderTextColor="#475569"
        style={[inputStyle, { height: 80, textAlignVertical: 'top' }]}
        multiline
      />

      {(['a', 'b', 'c'] as const).map((opt) => (
        <View key={opt}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <TouchableOpacity
              onPress={() => setQuiz((q) => ({ ...q, correct_answer: opt }))}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: quiz.correct_answer === opt ? '#10B981' : 'rgba(255,255,255,0.2)',
                backgroundColor: quiz.correct_answer === opt ? 'rgba(16,185,129,0.2)' : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              {quiz.correct_answer === opt && <Ionicons name="checkmark" size={12} color="#10B981" />}
            </TouchableOpacity>
            <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700' }}>
              Réponse {opt.toUpperCase()} {quiz.correct_answer === opt && '(correcte)'}
            </Text>
          </View>
          <TextInput
            value={quiz[`option_${opt}` as keyof QuizQuestion] as string}
            onChangeText={(t) => setQuiz((q) => ({ ...q, [`option_${opt}`]: t }))}
            placeholder={`Option ${opt.toUpperCase()}...`}
            placeholderTextColor="#475569"
            style={[inputStyle, { borderColor: quiz.correct_answer === opt ? 'rgba(16,185,129,0.4)' : undefined }]}
          />
        </View>
      ))}

      <Text style={inputLabel}>Explication (affiché après la réponse)</Text>
      <TextInput
        value={quiz.explanation}
        onChangeText={(t) => setQuiz((q) => ({ ...q, explanation: t }))}
        placeholder="Expliquez pourquoi c'est la bonne réponse..."
        placeholderTextColor="#475569"
        style={[inputStyle, { height: 70, textAlignVertical: 'top' }]}
        multiline
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18, marginBottom: 20 }}>
        Récapitulatif
      </Text>

      {/* Résumé */}
      {[
        { label: 'Titre', value: title || '—' },
        { label: 'Matière', value: selectedSubject?.name || '—' },
        { label: 'Difficulté', value: difficulty },
        { label: 'Vidéo', value: videoFile?.name || '—' },
        { label: 'Quiz', value: quiz.question_text ? '✓ Question ajoutée' : '✗ Aucune question' },
      ].map((item) => (
        <View
          key={item.label}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <Text style={{ color: '#64748B', fontSize: 13 }}>{item.label}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' }} numberOfLines={1}>
            {item.value}
          </Text>
        </View>
      ))}

      {/* Note modération */}
      <View
        style={{
          marginTop: 20,
          backgroundColor: 'rgba(251,191,36,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(251,191,36,0.25)',
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
        }}
      >
        <Ionicons name="information-circle-outline" size={20} color="#FBBF24" style={{ marginRight: 10, marginTop: 1 }} />
        <Text style={{ color: '#D4A017', fontSize: 12, lineHeight: 18, flex: 1 }}>
          Votre vidéo sera analysée par notre IA de modération (Whisper + GPT-4). Les cours avec un score ≥ 80/100 sont approuvés automatiquement. Les autres sont examinés manuellement sous 24h.
        </Text>
      </View>
    </View>
  );

  const STEPS = ['Informations', 'Quiz', 'Publier'];

  const inputLabel = {
    color: '#94A3B8' as const,
    fontSize: 12,
    fontWeight: '700' as const,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  };

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#090A1A' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* En-tête */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 58,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18 }}>
            Publier un cours
          </Text>
          <Text style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>
            Étape {currentStep + 1} sur {STEPS.length} — {STEPS[currentStep]}
          </Text>
        </View>
      </View>

      {/* Indicateurs d'étapes */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, gap: 8 }}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= currentStep ? '#818CF8' : 'rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingBottom: 120 }}>
          {currentStep === 0 && renderStep0()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
        </View>
      </ScrollView>

      {/* Boutons navigation bas */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 20,
          paddingBottom: 36,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          gap: 12,
          backgroundColor: '#090A1A',
        }}
      >
        {currentStep > 0 && (
          <TouchableOpacity
            onPress={() => setCurrentStep((s) => s - 1)}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#94A3B8', fontWeight: '700', fontSize: 15 }}>Retour</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={currentStep < STEPS.length - 1 ? () => setCurrentStep((s) => s + 1) : handleSubmit}
          disabled={isUploading}
          style={{
            flex: 2,
            height: 52,
            borderRadius: 16,
            backgroundColor: isUploading ? '#334155' : '#818CF8',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#818CF8',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isUploading ? 0 : 0.4,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          {isUploading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                {uploadStep === 'video' ? 'Envoi vidéo...' : 'Finalisation...'}
              </Text>
            </View>
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
              {currentStep < STEPS.length - 1 ? 'Suivant →' : '🚀 Publier le cours'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
