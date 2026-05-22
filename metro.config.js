const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// 1. Récupérer la configuration Metro par défaut fournie par Expo
const config = getDefaultConfig(__dirname);

// 2. L'envelopper avec withNativeWind en indiquant le fichier CSS d'entrée
module.exports = withNativeWind(config, { 
  input: "./src/global.css" 
});
