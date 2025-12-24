/**
 * Platform Detection Utility
 * Detects if running on web, iOS, or Android
 */

import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

export const isIOS = () => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = () => {
  return Capacitor.getPlatform() === 'android';
};

export const isWeb = () => {
  return Capacitor.getPlatform() === 'web';
};

export const getPlatform = () => {
  return Capacitor.getPlatform();
};

console.log('[Platform] Running on:', getPlatform());
