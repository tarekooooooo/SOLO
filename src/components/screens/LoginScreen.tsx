import React from 'react';
import { AuthScreen } from './AuthScreen';

/** Legacy route retained for compatibility; authentication is handled by AuthScreen. */
export const LoginScreen: React.FC = () => <AuthScreen />;
