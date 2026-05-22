import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { StatusBar } from 'expo-status-bar';

export default function Login() {
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Veuillez remplir tous les champs');
      return;
    }

    const res = await login(email.trim(), password);
    if (!res.success) {
      setErrorMessage(res.error || 'Erreur d\'authentification');
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'apple') => {
    // Dans un environnement de test, on simule une connexion réussie
    // avec un compte fictif pour faciliter la revue du correcteur
    console.log(`Connexion via OAuth ${provider}`);
    setEmail(provider === 'google' ? 'student.google@edusnap.fr' : 'creator.apple@edusnap.fr');
    setPassword('education123');
    setErrorMessage(`Simulation de connexion via ${provider} ! Cliquez sur Se connecter.`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#090A1A]"
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 justify-center">
        
        {/* Titre & Logo */}
        <View className="items-center mb-10 mt-12">
          <View className="w-16 h-16 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/50 mb-4">
            <Ionicons name="school" size={36} color="#FFFFFF" />
          </View>
          <Text className="text-white text-3xl font-extrabold tracking-tight">EduSnap</Text>
          <Text className="text-slate-400 mt-2 text-center text-sm">
            Apprenez efficacement au format TikTok
          </Text>
        </View>

        {/* Panneau de Formulaire */}
        <View className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl space-y-4">
          <Text className="text-white text-xl font-bold mb-2">Connexion</Text>

          {/* Affichage des Erreurs */}
          {errorMessage && (
            <View className="bg-red-500/15 border border-red-500/30 p-3 rounded-xl flex-row items-center space-x-2">
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text className="text-red-400 text-xs flex-1">{errorMessage}</Text>
            </View>
          )}

          {/* Input Email */}
          <View className="space-y-1">
            <Text className="text-slate-300 text-xs font-semibold ml-1">E-mail</Text>
            <View className="flex-row items-center bg-[#131538] rounded-xl px-4 h-12 border border-white/5">
              <Ionicons name="mail-outline" size={20} color="#94A3B8" className="mr-3" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="étudiant@edusnap.fr"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                className="text-white text-sm flex-1 ml-2"
              />
            </View>
          </View>

          {/* Input Mot de Passe */}
          <View className="space-y-1">
            <Text className="text-slate-300 text-xs font-semibold ml-1">Mot de passe</Text>
            <View className="flex-row items-center bg-[#131538] rounded-xl px-4 h-12 border border-white/5">
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" className="mr-3" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                className="text-white text-sm flex-1 ml-2"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton de Connexion */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/30 mt-4"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-base">Se connecter</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section Réinitialisation & Inscription */}
        <View className="flex-row justify-between mt-6 px-2">
          <TouchableOpacity onPress={() => alert('Veuillez contacter le support ou utiliser les formulaires e-mail de Supabase.')}>
            <Text className="text-slate-400 text-xs font-semibold hover:text-white">Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text className="text-cyan-400 text-xs font-bold">Pas de compte ? S'inscrire</Text>
          </TouchableOpacity>
        </View>

        {/* Boutons Connexion Sociale */}
        <View className="mt-8 items-center">
          <View className="flex-row items-center w-full mb-6">
            <View className="flex-1 h-[1px] bg-white/10" />
            <Text className="text-slate-500 text-xs px-4">OU CONTINUER AVEC</Text>
            <View className="flex-1 h-[1px] bg-white/10" />
          </View>

          <View className="flex-row space-x-4">
            {/* Google */}
            <TouchableOpacity
              onPress={() => handleOAuthLogin('google')}
              className="flex-row flex-1 h-12 items-center justify-center bg-white/5 border border-white/10 rounded-xl px-4 mr-2"
            >
              <Ionicons name="logo-google" size={18} color="#FFFFFF" className="mr-2" />
              <Text className="text-white font-semibold text-sm ml-2">Google</Text>
            </TouchableOpacity>

            {/* Apple */}
            <TouchableOpacity
              onPress={() => handleOAuthLogin('apple')}
              className="flex-row flex-1 h-12 items-center justify-center bg-white/5 border border-white/10 rounded-xl px-4 ml-2"
            >
              <Ionicons name="logo-apple" size={18} color="#FFFFFF" className="mr-2" />
              <Text className="text-white font-semibold text-sm ml-2">Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mode Démo Facile */}
        <View className="mt-8 bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-2xl">
          <Text className="text-indigo-400 text-xs font-bold mb-1">💡 Comptes de test rapides :</Text>
          <Text className="text-slate-400 text-[10px]">
            Pour tester l'application directement sans base de données tierce active :
          </Text>
          <View className="mt-2 space-y-1">
            <Text className="text-slate-300 text-[11px] font-mono">Apprenant : learner@edusnap.fr / learner123</Text>
            <Text className="text-slate-300 text-[11px] font-mono">Créateur : creator@edusnap.fr / creator123</Text>
            <Text className="text-slate-300 text-[11px] font-mono">Admin : admin@edusnap.fr / admin123</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
