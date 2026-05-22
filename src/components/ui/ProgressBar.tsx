import React from 'react';
import { View } from 'react-native';

interface ProgressBarProps {
  progress: number; // Valeur entre 0 et 1
  color?: string; // Couleur optionnelle (ex: '#06B6D4')
  height?: number; // Hauteur optionnelle
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = '#06B6D4',
  height = 8,
}) => {
  const percentage = Math.min(100, Math.max(0, progress * 100));

  return (
    <View 
      style={{ height }}
      className="w-full bg-white/10 rounded-full overflow-hidden"
    >
      <View
        style={{
          width: `${percentage}%`,
          backgroundColor: color,
          height: '100%',
        }}
        className="rounded-full"
      />
    </View>
  );
};

export default ProgressBar;
