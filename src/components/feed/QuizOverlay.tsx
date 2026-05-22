import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Question } from '../../types';
import { useXP } from '../../hooks/useXP';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface QuizOverlayProps {
  videoId: string;
  videoTitle: string;
  subjectName: string;
  onClose: (quizPassed: boolean) => void;
}

export const QuizOverlay: React.FC<QuizOverlayProps> = ({
  videoId,
  videoTitle,
  subjectName,
  onClose,
}) => {
  const { awardQuizSuccess, penalizeQuizFailure } = useXP();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<'a' | 'b' | 'c' | null>(null);
  const [quizState, setQuizState] = useState<'pending' | 'correct' | 'incorrect' | 'timeout'>('pending');
  const [timer, setTimer] = useState(15);

  // Animations Reanimated
  const shakeOffset = useSharedValue(0);
  const scaleSuccess = useSharedValue(1);

  // Éléments d'animation standard
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;

  // 1. Charger la question de quiz depuis Supabase
  useEffect(() => {
    const fetchQuestion = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('video_id', videoId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setQuestion(data as Question);
        } else {
          // Fallback : Générer un QCM intelligent par défaut basé sur le sujet et le titre
          setQuestion({
            id: 'mock-id',
            video_id: videoId,
            question_text: `Concernant "${videoTitle}", quel est l'élément fondamental de cette leçon de ${subjectName} ?`,
            option_a: 'La théorie classique et son application rigoureuse',
            option_b: 'L\'expérimentation empirique menée en laboratoire',
            option_c: 'Le modèle prédictif assisté par calcul informatique',
            correct_answer: 'a',
            explanation: 'Cette option illustre parfaitement le concept central abordé dans la vidéo éducative.',
          });
        }
      } catch (e) {
        console.error('Erreur lors de la récupération de la question:', e);
      } finally {
        setLoading(false);
        // Animer l'apparition de l'overlay
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).current.start();
      }
    };

    fetchQuestion();
  }, [videoId]);

  // 2. Gérer le compte à rebours de 15 secondes
  useEffect(() => {
    if (loading || quizState !== 'pending') return;

    // Animer la barre de progression temporelle
    Animated.timing(timerWidth, {
      toValue: 0,
      duration: 15000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, quizState]);

  // 3. Cas : Temps écoulé
  const handleTimeout = () => {
    setQuizState('timeout');
    setSelectedOption(null);
  };

  // 4. Cas : Réponse sélectionnée
  const handleOptionSelect = async (option: 'a' | 'b' | 'c') => {
    if (quizState !== 'pending') return;
    
    setSelectedOption(option);
    const isCorrect = option === question?.correct_answer;

    if (isCorrect) {
      setQuizState('correct');
      // Confetti & Scale Animation
      scaleSuccess.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
      await awardQuizSuccess();
    } else {
      setQuizState('incorrect');
      // Shake Animation
      shakeOffset.value = withSequence(
        withTiming(-10, { duration: 80 }),
        withTiming(10, { duration: 80 }),
        withTiming(-10, { duration: 80 }),
        withTiming(10, { duration: 80 }),
        withTiming(0, { duration: 80 })
      );
      await penalizeQuizFailure();
    }
  };

  // Styles animés Reanimated
  const animatedStyleCard = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: shakeOffset.value },
        { scale: scaleSuccess.value }
      ],
    };
  });

  if (loading) {
    return (
      <View className="absolute inset-0 bg-[#090A1A]/95 items-center justify-center z-50">
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text className="text-white text-sm font-semibold mt-4">Chargement du quiz...</Text>
      </View>
    );
  }

  if (!question) return null;

  return (
    <Animated.View 
      style={{ opacity: fadeAnim }}
      className="absolute inset-0 bg-[#090A1A]/90 px-6 justify-center items-center z-50"
    >
      <AnimatedReanimated.View 
        style={animatedStyleCard}
        className="w-full bg-[#131538] border border-white/10 rounded-3xl p-6 shadow-2xl relative"
      >
        {/* En-tête du Quiz */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center bg-cyan-950/40 px-3 py-1.5 rounded-full border border-cyan-500/20">
            <Ionicons name="school" size={16} color="#06B6D4" />
            <Text className="text-cyan-400 text-xs font-bold ml-1.5">{subjectName}</Text>
          </View>
          
          {quizState === 'pending' && (
            <View className="flex-row items-center">
              <Ionicons name="timer-outline" size={18} color={timer <= 5 ? '#EF4444' : '#FFFFFF'} />
              <Text 
                className={`text-sm font-bold ml-1.5 ${
                  timer <= 5 ? 'text-red-500' : 'text-white'
                }`}
              >
                {timer}s
              </Text>
            </View>
          )}
        </View>

        {/* Barre de Timer (Shrinking) */}
        {quizState === 'pending' && (
          <View className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
            <Animated.View 
              style={{
                width: timerWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: timer <= 5 ? '#EF4444' : '#06B6D4',
              }}
              className="h-full rounded-full"
            />
          </View>
        )}

        {/* Libellé Question */}
        <Text className="text-white text-lg font-bold mb-6 leading-6 text-center">
          {question.question_text}
        </Text>

        {/* Options de réponse */}
        <View className="space-y-3">
          {(['a', 'b', 'c'] as const).map((opt) => {
            const isSelected = selectedOption === opt;
            const isCorrectAnswer = question.correct_answer === opt;
            
            let btnStyle = 'border-white/10 bg-white/5';
            let txtStyle = 'text-slate-200';
            let checkIcon = null;

            if (quizState !== 'pending') {
              if (isCorrectAnswer) {
                // Toujours afficher la bonne réponse en vert
                btnStyle = 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-500/10';
                txtStyle = 'text-emerald-400 font-bold';
                checkIcon = <Ionicons name="checkmark-circle" size={18} color="#10B981" />;
              } else if (isSelected && !isCorrectAnswer) {
                // Mauvaise réponse sélectionnée en rouge
                btnStyle = 'bg-rose-950/30 border-rose-500 shadow-md shadow-rose-500/10';
                txtStyle = 'text-rose-400 font-bold';
                checkIcon = <Ionicons name="close-circle" size={18} color="#EF4444" />;
              }
            } else {
              // En attente
              if (isSelected) {
                btnStyle = 'bg-indigo-950/40 border-indigo-500';
              }
            }

            const label = opt === 'a' ? question.option_a : opt === 'b' ? question.option_b : question.option_c;

            return (
              <TouchableOpacity
                key={opt}
                onPress={() => handleOptionSelect(opt)}
                disabled={quizState !== 'pending'}
                className={`w-full flex-row items-center justify-between border rounded-2xl p-4 min-h-[56px] ${btnStyle}`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <Text className={`text-sm mr-3 font-semibold uppercase ${txtStyle}`}>
                    {opt}.
                  </Text>
                  <Text className={`text-xs flex-1 leading-5 ${txtStyle}`}>
                    {label}
                  </Text>
                </View>
                {checkIcon}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FEEDBACK & EXPLICATION (POST-REPONSE) */}
        {quizState !== 'pending' && (
          <View className="mt-6 bg-[#090A1A]/40 border border-white/5 p-4 rounded-2xl">
            {/* Header Feedback */}
            <View className="flex-row items-center mb-2">
              <Ionicons 
                name={
                  quizState === 'correct' 
                    ? 'checkmark-circle-outline' 
                    : quizState === 'incorrect' 
                    ? 'close-circle-outline' 
                    : 'timer-outline'
                } 
                size={20} 
                color={
                  quizState === 'correct' 
                    ? '#10B981' 
                    : quizState === 'incorrect' 
                    ? '#EF4444' 
                    : '#F59E0B'
                } 
              />
              <Text 
                className={`text-sm font-bold ml-2 ${
                  quizState === 'correct' 
                    ? 'text-emerald-400' 
                    : quizState === 'incorrect' 
                    ? 'text-rose-400' 
                    : 'text-brand-gold'
                }`}
              >
                {quizState === 'correct' 
                  ? 'Félicitations ! +10 XP 🏆' 
                  : quizState === 'incorrect' 
                  ? 'Mauvaise réponse. -2 XP 😢' 
                  : 'Temps écoulé ! ⏳'}
              </Text>
            </View>

            {/* Explication */}
            <Text className="text-slate-400 text-xs leading-5">
              {question.explanation || 'Pas de détails supplémentaires pour cette question.'}
            </Text>
          </View>
        )}

        {/* BOUTONS D'ACTION INFÉRIEUR */}
        <View className="flex-row space-x-3 mt-6">
          {quizState === 'pending' ? (
            // Skip Button
            <TouchableOpacity
              onPress={() => onClose(false)}
              className="flex-1 h-12 rounded-xl border border-white/10 items-center justify-center bg-white/5"
            >
              <Text className="text-white/80 font-bold text-sm">Passer le quiz</Text>
            </TouchableOpacity>
          ) : (
            // Close / Next Video Button
            <TouchableOpacity
              onPress={() => onClose(quizState === 'correct')}
              className={`flex-1 h-12 rounded-xl items-center justify-center shadow-lg ${
                quizState === 'correct' 
                  ? 'bg-emerald-600 shadow-emerald-600/20' 
                  : 'bg-indigo-600 shadow-indigo-600/20'
              }`}
            >
              <Text className="text-white font-extrabold text-sm">
                {quizState === 'correct' ? 'Continuer' : 'Vidéo suivante'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </AnimatedReanimated.View>
    </Animated.View>
  );
};

export default QuizOverlay;
