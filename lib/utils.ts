import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lon2 - lon1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function dayRouteKm(locations: Array<{ lat: number; lng: number }>): number {
  let total = 0;
  for (let i = 1; i < locations.length; i++) {
    total += haversineKm(locations[i - 1].lat, locations[i - 1].lng, locations[i].lat, locations[i].lng);
  }
  return Math.round(total * 10) / 10;
}
