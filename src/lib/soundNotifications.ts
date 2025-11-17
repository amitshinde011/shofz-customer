// Audio notification system for support messages
let audioContext: AudioContext | null = null;
let notificationSound: AudioBuffer | null = null;

// Sound notification categories
export const SOUND_KEYS = {
  SUPPORT: 'support_sound_enabled',
  INQUIRY: 'inquiry_sound_enabled',
  NOTIFICATION: 'notification_sound_enabled',
  PAYMENT: 'payment_sound_enabled',
};

export const initializeSoundNotifications = async () => {
  if (typeof window === 'undefined') return;
  
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Generate simple beep sound (800Hz tone, 0.2s duration)
    const duration = 0.2;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate tone with fade out
    for (let i = 0; i < buffer.length; i++) {
      const fadeOut = 1 - (i / buffer.length);
      data[i] = Math.sin(2 * Math.PI * 800 * i / sampleRate) * 0.3 * fadeOut;
    }
    
    notificationSound = buffer;
  } catch (error) {
    console.error('Failed to initialize sound notifications:', error);
  }
};

export const playNotificationSound = (
  priority: 'low' | 'medium' | 'high' = 'medium',
  category: 'support' | 'inquiry' | 'notification' | 'payment' = 'notification'
) => {
  // Check if sound is enabled for this category
  let isEnabled = false;
  switch (category) {
    case 'support':
      isEnabled = isSoundEnabled();
      break;
    case 'inquiry':
      isEnabled = isInquirySoundEnabled();
      break;
    case 'notification':
      isEnabled = isNotificationSoundEnabled();
      break;
    case 'payment':
      isEnabled = isPaymentSoundEnabled();
      break;
  }

  if (!audioContext || !notificationSound || !isEnabled) return;
  
  try {
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = notificationSound;
    
    // Adjust volume based on priority
    const volumes = { low: 0.3, medium: 0.5, high: 0.7 };
    gainNode.gain.value = volumes[priority];
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start(0);
    
    // Play double beep for high priority
    if (priority === 'high') {
      setTimeout(() => {
        const source2 = audioContext!.createBufferSource();
        const gainNode2 = audioContext!.createGain();
        source2.buffer = notificationSound;
        gainNode2.gain.value = volumes[priority];
        source2.connect(gainNode2);
        gainNode2.connect(audioContext!.destination);
        source2.start(0);
      }, 200);
    }
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

export const isSoundEnabled = (): boolean => {
  return localStorage.getItem(SOUND_KEYS.SUPPORT) !== 'false';
};

export const setSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_KEYS.SUPPORT, enabled ? 'true' : 'false');
};

export const isInquirySoundEnabled = (): boolean => {
  return localStorage.getItem(SOUND_KEYS.INQUIRY) !== 'false';
};

export const setInquirySoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_KEYS.INQUIRY, enabled ? 'true' : 'false');
};

export const isNotificationSoundEnabled = (): boolean => {
  return localStorage.getItem(SOUND_KEYS.NOTIFICATION) !== 'false';
};

export const setNotificationSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_KEYS.NOTIFICATION, enabled ? 'true' : 'false');
};

export const isPaymentSoundEnabled = (): boolean => {
  return localStorage.getItem(SOUND_KEYS.PAYMENT) !== 'false';
};

export const setPaymentSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_KEYS.PAYMENT, enabled ? 'true' : 'false');
};
