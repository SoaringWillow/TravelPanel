import { Platform } from './types';

export function detectPlatform(url: string): Platform {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('pinterest.')) return 'pinterest';
  if (url.includes('tripadvisor.')) return 'tripadvisor';
  if (url.includes('booking.com')) return 'booking';
  if (url.includes('airbnb.')) return 'airbnb';
  if (url.includes('reddit.com')) return 'reddit';
  return 'other';
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  wechat:      'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin:      'Douyin / TikTok',
  bilibili:    'Bilibili',
  instagram:   'Instagram',
  youtube:     'YouTube',
  twitter:     'X / Twitter',
  pinterest:   'Pinterest',
  tripadvisor: 'TripAdvisor',
  booking:     'Booking.com',
  airbnb:      'Airbnb',
  reddit:      'Reddit',
  other:       'Web',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  wechat:      '#07C160',
  xiaohongshu: '#FF2442',
  douyin:      '#161823',
  bilibili:    '#00AEEC',
  instagram:   '#E1306C',
  youtube:     '#FF0000',
  twitter:     '#1D9BF0',
  pinterest:   '#E60023',
  tripadvisor: '#00AA6C',
  booking:     '#003580',
  airbnb:      '#FF5A5F',
  reddit:      '#FF4500',
  other:       '#6366F1',
};

export const PLATFORM_BG: Record<Platform, string> = {
  wechat:      'bg-[#07C160]',
  xiaohongshu: 'bg-[#FF2442]',
  douyin:      'bg-[#161823]',
  bilibili:    'bg-[#00AEEC]',
  instagram:   'bg-[#E1306C]',
  youtube:     'bg-[#FF0000]',
  twitter:     'bg-[#1D9BF0]',
  pinterest:   'bg-[#E60023]',
  tripadvisor: 'bg-[#00AA6C]',
  booking:     'bg-[#003580]',
  airbnb:      'bg-[#FF5A5F]',
  reddit:      'bg-[#FF4500]',
  other:       'bg-indigo-500',
};
