import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { PlayerProvider } from './src/context/PlayerContext';
import Navigation from './src/navigation';

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <StatusBar style="light" />
        <Navigation />
      </PlayerProvider>
    </AuthProvider>
  );
}
