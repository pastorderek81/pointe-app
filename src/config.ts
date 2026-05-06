import Constants from 'expo-constants';

type Extra = {
  pcoClientId: string;
  youtubeApiKey: string;
  youtubeChannelHandle: string;
  pushpayUrl: string;
  proxyUrl: string;
  youversionUrl: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const config = {
  pcoClientId: extra.pcoClientId ?? '',
  youtubeApiKey: extra.youtubeApiKey ?? '',
  youtubeChannelHandle: extra.youtubeChannelHandle ?? '@thepointechurch4274',
  pushpayUrl: extra.pushpayUrl ?? 'https://pushpay.com/g/thepointechurchcb',
  proxyUrl: extra.proxyUrl ?? '',
  youversionUrl: extra.youversionUrl ?? '',
};

export const isPlaceholder = (v: string) => !v || v.startsWith('REPLACE_ME');
