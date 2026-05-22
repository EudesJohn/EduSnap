import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, FlatGrid } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Subject, AccountType } from '../../types';
import { StatusBar } from 'expo-status-bar';

export default function Register() {
  const { register, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Étape de l'inscription (1: Infos compte, 2: Matières préférées)
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('learner');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Étape 2: Sélection des matières
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // Charger les matières scolaires depuis Supabase pour l'Étape 2
  useEffect(() => {
    if (step === 2) {
      const fetchSubjects = async () => {
        setSubjectsLoading(true);
        try {
          const { data, error } = await supabase
            .from('subjects')
            .select('*');
          
          if (error) throw error;
          setSubjects(data || []);
        } catch (e) {
          console.error('Erreur lors du chargement des matières:', e);
          // Fallback statique si la base n'est pas encore connectée
          setSubjects([
            { id: 1, name: 'Mathématiques', icon: 'calculator-outline', color: '#4F46E5' },
            { id: 2, name: 'Physique-Chimie', icon: 'beaker-outline', color: '#EF4444' },
            { id: 3, name: 'SVT', icon: 'leaf-outline', color: '#10B981' },
            { id: 4, name: 'Histoire-Géographie', icon: 'globe-outline', color: '#F59E0B' },
            { id: 5, name: 'Philosophie', icon: 'brain', color: '#8B5CF6' },
            { id: 6, name: 'Français', icon: 'book-outline', color: '#EC4899' },
            { id: 7, name: 'Anglais', icon: 'chatbubbles-outline', color: '#06B6D4' },
            { id: 8, name: 'Informatique', icon: 'code-slash-outline', color: '#3B82F6' },
          ]);
        } finally {
          setSubjectsLoading(false);
        }
      };
      fetchSubjects();
    }
  }, [step]);

  // Étape 1 : Soumission du compte
  const handleAccountSubmit = async () => {
    setErrorMessage(null);

    if (!email || !password || !username || !fullName) {
      setErrorMessage('Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const res = await register(
      email.trim(),
      password,
      username.trim(),
      fullName.trim(),
      accountType
    );

    if (res.success) {
      // Inscription réussie -> passage à l'étape de sélection des matières
      setStep(2);
    } else {
      setErrorMessage(res.error || 'Erreur lors de l\'inscription');
    }
  };

  // Étape 2 : Toggling d'une matière
  const toggleSubject = (subjectId: number) => {
    if (selectedSubjectIds.includes(subjectId)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subjectId));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subjectId]);
    }
  };

  // Étape 2 : Validation finale
  const handleSubjectsSubmit = async () => {
    if (selectedSubjectIds.length === 0) {
      alert('Veuillez sélectionner au moins 1 matière pour personnaliser votre feed !');
      return;
    }

    const activeUser = user || supabase.auth.getUser();
    if (!activeUser) {
      router.replace('/(tabs)');
      return;
    }

    setSubjectsLoading(true);
    try {
      const userId = (activeUser as any).id || (await supabase.auth.getUser()).data.user?.id;
      
      if (userId) {
        // Enregistrer les matières préférées de l'utilisateur
        const inserts = selectedSubjectIds.map((subId) => ({
          user_id: userId,
          subject_id: subId,
        }));

        const { error } = await supabase
          .from('user_subjects')
          .insert(inserts);

        if (error) throw error;
      }
      
      // Tout s'est bien déroulé -> redirection vers l'application principale
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Erreur lors de l\'enregistrement des matières préférées:', e.message);
      // Redirection tout de même pour ne pas bloquer l'utilisateur
      router.replace('/(tabs)');
    } finally {
      setSubjectsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#090A1A]"
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 justify-center">
        
        {/* ÉTAPE 1 : CRÉATION DU COMPTE */}
        {step === 1 && (
          <View className="my-8">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/50 mb-3">
                <Ionicons name="person-add-outline" size={28} color="#FFFFFF" />
              </View>
              <Text className="text-white text-2xl font-extrabold tracking-tight">Rejoindre EduSnap</Text>
              <Text className="text-slate-400 mt-1 text-xs">Créer un compte pour commencer l'aventure</Text>
            </View>

            {/* Formulaire */}
            <View className="bg-white/5 border border-white/10 p-5 rounded-3xl shadow-xl space-y-3">
              
              {/* Message d'erreur */}
              {errorMessage && (
                <View className="bg-red-500/15 border border-red-500/30 p-3 rounded-xl flex-row items-center space-x-2">
                  <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                  <Text className="text-red-400 text-xs flex-1">{errorMessage}</Text>
                </View>
              )}

              {/* Rôle Selector */}
              <View className="space-y-1">
                <Text className="text-slate-300 text-xs font-semibold ml-1">Type de compte</Text>
                <View className="flex-row bg-[#131538] rounded-xl p-1 border border-white/5">
                  <TouchableOpacity
                    onPress={() => setAccountType('learner')}
                    className={`flex-1 py-2 rounded-lg items-center justify-center ${
                      accountType === 'learner' ? 'bg-indigo-600' : 'bg-transparent'
                    }`}
                  >
                    <Text className="text-white text-xs font-bold">🎓 Apprenant</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => setAccountType('creator')}
                    className={`flex-1 py-2 rounded-lg items-center justify-center ${
                      accountType === 'creator' ? 'bg-indigo-600' : 'bg-transparent'
                    }`}
                  >
                    <Text className="text-white text-xs font-bold">🎥 Créateur</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nom Complet */}
              <View className="space-y-1">
                <Text className="text-slate-300 text-xs font-semibold ml-1">Nom complet</Text>
                <View className="flex-row items-center bg-[#131538] rounded-xl px-4 h-11 border border-white/5">
                  <Ionicons name="card-outline" size={18} color="#94A3B8" />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Jean Dupont"
                    placeholderTextColor="#64748B"
                    className="text-white text-xs flex-1 ml-3"
                  />
                </View>
              </View>

              {/* Nom d'utilisateur */}
              <View className="space-y-1">
                <Text className="text-slate-300 text-xs font-semibold ml-1">Nom d'utilisateur (@username)</Text>
                <View className="flex-row items-center bg-[#131538] rounded-xl px-4 h-11 border border-white/5">
                  <Ionicons name="at-outline" size={18} color="#94A3B8" />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="jeandupont"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    className="text-white text-xs flex-1 ml-3"
                  />
                </View>
              </View>

              {/* E-mail */}
              <View className="space-y-1">
                <Text className="text-slate-300 text-xs font-semibold ml-1">E-mail</Text>
                <View className="flex-row items-center bg-[#131538] rounded-xl px-4 h-11 border border-white/5">
                  <Ionicons name="mail-outline" size={18} color="#94A3B8" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="adresse@mail.fr"
                    placeholderTextColor="#64748B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="text-white text-xs flex-1 ml-3"
                  />
                </View>
              </View>

              {/* Mot de passe */}
              <View className="space-y-1">
                <Text className="text-slate-300 text-xs font-semibold ml-1">Mot de passe</Text>
                <View className="flex-row items-center bg-[#131538] rounded-xl px-4 h-11 border border-white/5">
                  <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Minimum 6 caractères"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    autoCapitalize="none"
                    className="text-white text-xs flex-1 ml-3"
                  />
                </View>
              </View>

              {/* Bouton Suivant */}
              <TouchableOpacity
                onPress={handleAccountSubmit}
                disabled={authLoading}
                className="w-full h-11 rounded-xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/30 mt-3"
              >
                {authLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-sm mr-2">Suivant</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Lien Connexion */}
            <TouchableOpacity 
              onPress={() => router.push('/(auth)/login')}
              className="mt-6 items-center"
            >
              <Text className="text-slate-400 text-xs">
                Déjà inscrit ? <Text className="text-cyan-400 font-bold">Se connecter</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ÉTAPE 2 : SÉLECTION DES MATIÈRES PRÉFÉRÉES */}
        {step === 2 && (
          <View className="my-8">
            <View className="items-center mb-6">
              <View className="w-14 h-14 rounded-2xl bg-cyan-500 items-center justify-center shadow-lg shadow-cyan-500/50 mb-3">
                <Ionicons name="library-outline" size={28} color="#FFFFFF" />
              </View>
              <Text className="text-white text-2xl font-extrabold tracking-tight">Vos matières favorites</Text>
              <Text className="text-slate-400 mt-1 text-center text-xs px-4">
                Sélectionnez les matières que vous aimez pour calibrer vos recommandations vidéo.
              </Text>
            </View>

            {/* Grid des Matières */}
            {subjectsLoading && subjects.length === 0 ? (
              <ActivityIndicator size="large" color="#06B6D4" className="my-10" />
            ) : (
              <View className="flex-row flex-wrap justify-between mb-6">
                {subjects.map((subj) => {
                  const isSelected = selectedSubjectIds.includes(subj.id);
                  return (
                    <TouchableOpacity
                      key={subj.id}
                      onPress={() => toggleSubject(subj.id)}
                      className={`w-[48%] h-24 rounded-2xl p-4 mb-4 border justify-between transition-all ${
                        isSelected 
                          ? 'bg-indigo-950/40 border-cyan-400 shadow-md shadow-cyan-500/10' 
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <View 
                        className="w-8 h-8 rounded-lg items-center justify-center" 
                        style={{ backgroundColor: subj.color || '#4F46E5' }}
                      >
                        <Ionicons 
                          name={(subj.icon || 'book-outline') as any} 
                          size={16} 
                          color="#FFFFFF" 
                        />
                      </View>
                      
                      <View className="flex-row items-center justify-between">
                        <Text className="text-white text-xs font-bold">{subj.name}</Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color="#06B6D4" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Validation */}
            <TouchableOpacity
              onPress={handleSubjectsSubmit}
              disabled={subjectsLoading}
              className="w-full h-12 rounded-xl bg-cyan-500 items-center justify-center shadow-lg shadow-cyan-500/30"
            >
              {subjectsLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-slate-950 font-extrabold text-base">Finaliser & Découvrir</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
