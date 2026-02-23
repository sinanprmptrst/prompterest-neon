import { Capacitor } from '@capacitor/core';

let HapticsModule: typeof import('@capacitor/haptics').Haptics | null = null;

async function getHaptics() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!HapticsModule) {
    const mod = await import('@capacitor/haptics');
    HapticsModule = mod.Haptics;
  }
  return HapticsModule;
}

export async function hapticLight() {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.impact({ style: 'LIGHT' as never });
  }
}

export async function hapticMedium() {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.impact({ style: 'MEDIUM' as never });
  }
}

export async function hapticHeavy() {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.impact({ style: 'HEAVY' as never });
  }
}

export async function hapticSelection() {
  const haptics = await getHaptics();
  if (haptics) {
    await haptics.selectionStart();
    await haptics.selectionEnd();
  }
}
