import { type RefObject } from "react";
import { motion } from "framer-motion";
import {
  User, Camera, Edit2, ShieldCheck, Lock, IdCard, Loader2,
} from '@/components/icons/lucide-compat';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCountry } from "@/contexts/CountryContext";
import { itemVariants } from './constants';
import type { Profile } from './types';

interface ProfileHeaderProps {
  profile: Profile | null;
  displayName: string;
  userEmail: string | undefined;
  avatarUploading: boolean;
  onAvatarClick: () => void;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onEditClick: () => void;
  misauLinked: boolean;
}

export function ProfileHeader({
  profile,
  displayName,
  userEmail,
  avatarUploading,
  onAvatarClick,
  onAvatarChange,
  fileInputRef,
  onEditClick,
  misauLinked,
}: ProfileHeaderProps) {
  const { t } = useCountry();

  return (
    <>
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={onAvatarClick}
            disabled={avatarUploading}
            className="relative w-16 h-16 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait"
            aria-label={t("profile.avatar_button_aria")}
          >
            {avatarUploading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />
            ) : profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={t("profile.avatar_alt", { name: displayName })}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-primary" aria-hidden="true" />
            )}
          </button>
          <span
            className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-primary-foreground pointer-events-none"
            aria-hidden="true"
          >
            <Camera className="h-3 w-3" />
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            className="sr-only"
            aria-label={t("profile.upload_avatar")}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground">{profile.phone}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">{t("profile.avatar_hint")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEditClick}
          className="h-11 w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={t("profile.edit_button_aria")}
        >
          <Edit2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </motion.div>

      {/* TRUST BADGES STRIP */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 bg-green-50/50 border-green-200 text-green-700 text-xs py-1"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("profile.trust_verified")}
        </Badge>
        <Badge
          variant="outline"
          className="gap-1.5 bg-blue-50/50 border-blue-200 text-blue-700 text-xs py-1"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t("profile.trust_encrypted")}
        </Badge>
        {misauLinked && (
          <Badge
            variant="outline"
            className="gap-1.5 bg-emerald-50/50 border-emerald-200 text-emerald-700 text-xs py-1"
          >
            <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
            {t("profile.trust_misau_registered")}
          </Badge>
        )}
      </motion.div>
    </>
  );
}
