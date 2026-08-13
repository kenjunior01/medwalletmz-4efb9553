import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from '@/components/icons/lucide-compat';
import { useCountry } from "@/contexts/CountryContext";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editName: string;
  onNameChange: (name: string) => void;
  editPhone: string;
  onPhoneChange: (phone: string) => void;
  saving: boolean;
  onSave: () => void;
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  editName,
  onNameChange,
  editPhone,
  onPhoneChange,
  saving,
  onSave,
}: ProfileEditDialogProps) {
  const { t } = useCountry();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profile.edit_profile")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="edit-name">
              {t("profile.full_name")}
            </label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t("profile.placeholder_name")}
              className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="edit-phone">
              {t("profile.phone")}
            </label>
            <Input
              id="edit-phone"
              value={editPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder={t("profile.placeholder_phone")}
              className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                {t("profile.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
