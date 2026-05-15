import type { UserProfile } from "@/contexts/auth-context";

const CMS_DOMAIN = process.env.EXPO_PUBLIC_CMS || "https://cms.youpass.vn";
const FALLBACK_AVATAR = "https://www.gravatar.com/avatar/?d=mp&s=160";

export const getFullName = (profile?: UserProfile | null): string => {
  if (!profile) return "";
  if (profile.fullname) return profile.fullname.trim();
  const composed = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return composed || profile.email || "";
};

export const getAvatarUrl = (profile?: UserProfile | null): string => {
  if (!profile) return FALLBACK_AVATAR;
  if (profile.external_avatar) return profile.external_avatar;
  if (profile.avatar) return `${CMS_DOMAIN}/assets/${profile.avatar}`;
  return FALLBACK_AVATAR;
};

export const getGreetingByHour = (date: Date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
};

export const getInitials = (profile?: UserProfile | null): string => {
  const name = getFullName(profile);
  if (!name) return "YP";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YP";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] || "") + (parts[parts.length - 1]![0] || "")).toUpperCase();
};
