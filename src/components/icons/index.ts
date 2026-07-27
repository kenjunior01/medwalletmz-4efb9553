/**
 * MedWallet MZ — Icon Library Barrel Export
 * 
 * Drop-in replacement for lucide-react.
 * Every icon is a unique, hand-crafted SVG with gradient, glow, and medical branding.
 * 
 * Usage:
 *   import { MWHome, MWStethoscope, MWWallet } from '@/components/icons';
 *   <MWHome className="h-5 w-5" />
 */

// ─── Types ─────────────────────────────────────────────────────
export type { MWIconProps, MWIconComponent } from './MedwalletIconBase';
export { parseSize, MWDefs, MWBase, createMWIcon } from './MedwalletIconBase';

// ─── Navigation & Core Icons (Batch 1) ─────────────────────────
export {
  MWHome, MWStethoscope, MWPill, MWBuilding2, MWFlaskConical,
  MWCalendar, MWUsers, MWMessageSquare, MWTruck, MWPackage,
  MWBarChart3, MWShield, MWWallet, MWSettings, MWLayoutDashboard,
  MWHospital, MWVideo, MWCrown, MWTrendingUp, MWBookOpen,
} from './MWNavIcons';

// ─── Action & UI Icons (Batch 2) ──────────────────────────────
export {
  MWArrowLeft, MWArrowRight, MWArrowUp, MWArrowDown,
  MWPlus, MWX, MWCheck, MWCheckCircle2,
  MWChevronRight, MWChevronLeft, MWChevronDown, MWChevronUp,
  MWMenu, MWSearch, MWFilter, MWBell, MWMoreHorizontal,
  MWEdit, MWTrash2, MWCopy, MWDownload, MWUpload,
  MWShare2, MWRefreshCw, MWExternalLink,
  MWEye, MWEyeOff, MWHeart, MWStar, MWZap,
} from './MWActionIcons';

// ─── Health & Medical Icons (Batch 3) ─────────────────────────
export {
  MWDroplet, MWHeartPulse, MWFileText, MWClipboardList, MWScan,
  MWActivity, MWShieldCheck, MWThermometerSun, MWMapPin, MWBaby,
  MWPawPrint, MWMegaphone, MWStore, MWBriefcase,
  MWPhone, MWPhoneCall, MWGlobe, MWMap, MWNavigate, MWCompass,
  MWUser, MWUserPlus, MWTrophy, MWMedal, MWSparkles,
  MWHeartHandshake, MWGlobe2, MWCreditCard, MWReceipt, MWSnowflake,
} from './MWHealthIcons';

// ─── Miscellaneous Icons (Batch 4) ────────────────────────────
export {
  MWClock, MWClock3, MWLoader2, MWCloud, MWCloudOff, MWCloudRain,
  MWCoffee, MWCoins, MWDollarSign, MWLock, MWLogIn, MWLogOut,
  MWMail, MWImage, MWInfo, MWHelpCircle, MWKeyRound, MWLanguages,
  MWLayers, MWList, MWPanelLeft, MWPaperclip, MWPause, MWPauseCircle,
  MWPencil, MWPercent, MWSave, MWScale, MWSend, MWTag, MWTarget,
  MWCamera, MWGripVertical, MWHash, MWHistory, MWSmartphone,
  MWMoon, MWSun, MWMonitor, MWWind, MWFlame, MWBeaker, MWPalette,
  MWSlidersHorizontal, MWSmile, MWChefHat, MWWifiOff,
  MWAlertCircle, MWAlertTriangle, MWFolderHeart,
} from './MWMiscIcons';
