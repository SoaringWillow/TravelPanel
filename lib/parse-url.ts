import { Platform } from './types';

export function detectPlatform(url: string): Platform {
  if (url.includes('weixin.qq.com') || url.includes('mp.weixin')) return 'wechat';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com') || url.includes('xhs.link')) return 'xiaohongshu';
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('tiktok.com')) return 'douyin';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  return 'other';
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  wechat: 'WeChat',
  xiaohongshu: 'Little Red Book',
  douyin: 'Douyin / TikTok',
  bilibili: 'Bilibili',
  other: 'Web',
};

export const PLATFORM_COLORS: Record<Platform, string> = {
  wechat: '#07C160',
  xiaohongshu: '#FF2442',
  douyin: '#161823',
  bilibili: '#00AEEC',
  other: '#6366F1',
};

export const PLATFORM_BG: Record<Platform, string> = {
  wechat: 'bg-[#07C160]',
  xiaohongshu: 'bg-[#FF2442]',
  douyin: 'bg-[#161823]',
  bilibili: 'bg-[#00AEEC]',
  other: 'bg-indigo-500',
};
