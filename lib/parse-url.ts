import { Platform } from './types';

export function detectPlatform(url: string): Platform {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  return 'other';
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  youtube: 'YouTube',
  instagram: 'Instagram',
  other: 'Web',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  youtube: '#FF0000',
  instagram: '#E1306C',
  other: '#6366F1',
};

export const PLATFORM_BG: Record<Platform, string> = {
  wechat: 'bg-[#07C160]',
  xiaohongshu: 'bg-[#FF2442]',
  douyin: 'bg-[#161823]',
  bilibili: 'bg-[#00AEEC]',
  youtube: 'bg-[#FF0000]',
  instagram: 'bg-[#E1306C]',
  other: 'bg-indigo-500',
};
