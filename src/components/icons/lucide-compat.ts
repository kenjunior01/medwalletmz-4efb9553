/**
 * MedWallet MZ — Lucide-to-MW Compatibility Adapter
 * 
 * Maps lucide-react icon names → MW custom icons.
 * Use this to migrate files: change `from "lucide-react"` → `from "@/components/icons/lucide-compat"`
 * 
 * All 156 lucide icon names are mapped. Missing custom icons fall back gracefully.
 */
import type { ComponentType, SVGProps } from 'react';

// Import ALL MW icons from individual files (no circular ref)
import {
  MWHome, MWStethoscope, MWPill, MWBuilding2, MWFlaskConical,
  MWCalendar, MWUsers, MWMessageSquare, MWTruck, MWPackage,
  MWBarChart3, MWShield, MWWallet, MWSettings, MWLayoutDashboard,
  MWHospital, MWVideo, MWCrown, MWTrendingUp, MWBookOpen,
  MWArrowLeft, MWArrowRight, MWArrowUp, MWArrowDown,
  MWPlus, MWX, MWCheck, MWCheckCircle2,
  MWChevronRight, MWChevronLeft, MWChevronDown, MWChevronUp,
  MWMenu, MWSearch, MWFilter, MWBell, MWMoreHorizontal,
  MWEdit, MWTrash2, MWCopy, MWDownload, MWUpload,
  MWShare2, MWRefreshCw, MWExternalLink,
  MWEye, MWEyeOff, MWHeart, MWStar, MWZap,
  MWDroplet, MWHeartPulse, MWFileText, MWClipboardList, MWScan,
  MWActivity, MWShieldCheck, MWThermometerSun, MWMapPin, MWBaby,
  MWPawPrint, MWMegaphone, MWStore, MWBriefcase,
  MWPhone, MWPhoneCall, MWGlobe, MWMap, MWNavigate, MWCompass,
  MWUser, MWUserPlus, MWTrophy, MWMedal, MWSparkles,
  MWHeartHandshake, MWGlobe2, MWCreditCard, MWReceipt, MWSnowflake,
  MWClock, MWClock3, MWLoader2, MWCloud, MWCloudOff, MWCloudRain,
  MWCoffee, MWCoins, MWDollarSign, MWLock, MWLogIn, MWLogOut,
  MWMail, MWImage, MWInfo, MWHelpCircle, MWKeyRound, MWLanguages,
  MWLayers, MWList, MWPanelLeft, MWPaperclip, MWPause, MWPauseCircle,
  MWPencil, MWPercent, MWSave, MWScale, MWSend, MWTag, MWTarget,
  MWCamera, MWGripVertical, MWHash, MWHistory, MWSmartphone,
  MWMoon, MWSun, MWMonitor, MWWind, MWFlame, MWBeaker, MWPalette,
  MWSlidersHorizontal, MWSmile, MWChefHat, MWWifiOff,
  MWAlertCircle, MWAlertTriangle, MWFolderHeart,
} from '@/components/icons';

// Re-export the LucideIcon type for compatibility
export type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

// ─── Complete lucide-react → MW mapping ───────────────────────
const _map: Record<string, LucideIcon> = {
  // ── Core Navigation ────────────────────────────────────────────
  Home: MWHome,
  Stethoscope: MWStethoscope,
  Pill: MWPill,
  Building2: MWBuilding2,
  FlaskConical: MWFlaskConical,
  Calendar: MWCalendar,
  Users: MWUsers,
  MessageSquare: MWMessageSquare,
  Truck: MWTruck,
  Package: MWPackage,
  BarChart3: MWBarChart3,
  Shield: MWShield,
  Wallet: MWWallet,
  Settings: MWSettings,
  LayoutDashboard: MWLayoutDashboard,
  Hospital: MWHospital,
  Video: MWVideo,
  Crown: MWCrown,
  TrendingUp: MWTrendingUp,
  BookOpen: MWBookOpen,
  Globe: MWGlobe,
  HeartHandshake: MWHeartHandshake,
  
  // ── Arrows ────────────────────────────────────────────────────
  ArrowLeft: MWArrowLeft,
  ArrowRight: MWArrowRight,
  ArrowUp: MWArrowUp,
  ArrowDown: MWArrowDown,
  ArrowDownCircle: MWArrowDown,
  ArrowDownRight: MWArrowDown,
  ArrowDownToLine: MWArrowDown,
  ArrowUpCircle: MWArrowUp,
  ArrowUpRight: MWArrowUp,
  
  // ── UI Actions ────────────────────────────────────────────────
  Plus: MWPlus,
  X: MWX,
  Check: MWCheck,
  CheckCircle: MWCheckCircle2,
  CheckCircle2: MWCheckCircle2,
  CheckCheck: MWCheckCircle2,
  XCircle: MWX,
  ChevronRight: MWChevronRight,
  ChevronLeft: MWChevronLeft,
  ChevronDown: MWChevronDown,
  ChevronUp: MWChevronUp,
  Menu: MWMenu,
  Search: MWSearch,
  Filter: MWFilter,
  Bell: MWBell,
  BellRing: MWBell,
  MoreHorizontal: MWMoreHorizontal,
  Edit: MWEdit,
  Edit2: MWEdit,
  Trash2: MWTrash2,
  Copy: MWCopy,
  Download: MWDownload,
  Upload: MWUpload,
  Share2: MWShare2,
  RefreshCw: MWRefreshCw,
  RotateCcw: MWRefreshCw,
  ExternalLink: MWExternalLink,
  
  // ── Visibility & Feedback ─────────────────────────────────────
  Eye: MWEye,
  EyeOff: MWEyeOff,
  Heart: MWHeart,
  Star: MWStar,
  Zap: MWZap,
  Sparkles: MWSparkles,
  Circle: MWTarget,
  Dot: MWTarget,
  Loader2: MWLoader2,
  
  // ── Health & Medical ──────────────────────────────────────────
  Droplet: MWDroplet,
  HeartPulse: MWHeartPulse,
  FileText: MWFileText,
  FileSignature: MWFileText,
  ClipboardList: MWClipboardList,
  Scan: MWScan,
  Activity: MWActivity,
  ShieldCheck: MWShieldCheck,
  ThermometerSun: MWThermometerSun,
  MapPin: MWMapPin,
  Locate: MWMapPin,
  LocateFixed: MWMapPin,
  Baby: MWBaby,
  PawPrint: MWPawPrint,
  Megaphone: MWMegaphone,
  
  // ── Places & Entities ────────────────────────────────────────
  Store: MWStore,
  Briefcase: MWBriefcase,
  Phone: MWPhone,
  PhoneCall: MWPhoneCall,
  Map: MWMap,
  Navigate: MWNavigate,
  Compass: MWCompass,
  Globe2: MWGlobe2,
  
  // ── People ────────────────────────────────────────────────────
  User: MWUser,
  UserPlus: MWUserPlus,
  
  // ── Achievements ──────────────────────────────────────────────
  Trophy: MWTrophy,
  Medal: MWMedal,
  
  // ── Financial ───────────────────────────────────────────────
  CreditCard: MWCreditCard,
  Receipt: MWReceipt,
  Coins: MWCoins,
  DollarSign: MWDollarSign,
  
  // ── Time & Status ─────────────────────────────────────────────
  Clock: MWClock,
  Clock3: MWClock3,
  History: MWHistory,
  CalendarCheck: MWCalendar,
  CalendarClock: MWClock,
  
  // ── Weather & Environment ────────────────────────────────────
  Cloud: MWCloud,
  CloudOff: MWCloudOff,
  CloudRain: MWCloudRain,
  Snowflake: MWSnowflake,
  Wind: MWWind,
  Sun: MWSun,
  Moon: MWMoon,
  Flame: MWFlame,
  
  // ── Media & Devices ──────────────────────────────────────────
  Image: MWImage,
  ImageIcon: MWImage,
  Camera: MWCamera,
  Monitor: MWMonitor,
  Smartphone: MWSmartphone,
  Mic: MWPhone,
  MicOff: MWPause,
  VideoOff: MWPause,
  Pause: MWPause,
  PauseCircle: MWPauseCircle,
  Minimize2: MWPause,
  
  // ── Communication ─────────────────────────────────────────────
  Mail: MWMail,
  Send: MWSend,
  Languages: MWLanguages,
  
  // ── Security ─────────────────────────────────────────────────
  Lock: MWLock,
  KeyRound: MWKeyRound,
  ShieldAlert: MWAlertTriangle,
  
  // ── UI Misc ─────────────────────────────────────────────────
  Info: MWInfo,
  HelpCircle: MWHelpCircle,
  AlertCircle: MWAlertCircle,
  AlertTriangle: MWAlertTriangle,
  Layers: MWLayers,
  List: MWList,
  PanelLeft: MWPanelLeft,
  Paperclip: MWPaperclip,
  Pencil: MWPencil,
  Percent: MWPercent,
  Save: MWSave,
  Scale: MWScale,
  Tag: MWTag,
  Target: MWTarget,
  GripVertical: MWGripVertical,
  Hash: MWHash,
  Beaker: MWBeaker,
  Palette: MWPalette,
  SlidersHorizontal: MWSlidersHorizontal,
  Smile: MWSmile,
  ChefHat: MWChefHat,
  WifiOff: MWWifiOff,
  FolderHeart: MWFolderHeart,
  Coffee: MWCoffee,
  Minus: MWX,
  LogIn: MWLogIn,
  LogOut: MWLogOut,
};

// ─── Public lookup function ────────────────────────────────────
/**
 * Get a MedWallet icon by its lucide-react name.
 * Falls back to MWPlus if not found.
 */
export function mwIcon(name: string): LucideIcon {
  return _map[name] || MWPlus;
}

// ─── Named exports matching lucide-react exactly ──────────────
export const Home = MWHome;
export const Stethoscope = MWStethoscope;
export const Pill = MWPill;
export const Building2 = MWBuilding2;
export const FlaskConical = MWFlaskConical;
export const Calendar = MWCalendar;
export const Users = MWUsers;
export const MessageSquare = MWMessageSquare;
export const Truck = MWTruck;
export const Package = MWPackage;
export const BarChart3 = MWBarChart3;
export const Shield = MWShield;
export const Wallet = MWWallet;
export const Settings = MWSettings;
export const LayoutDashboard = MWLayoutDashboard;
export const Hospital = MWHospital;
export const Video = MWVideo;
export const Crown = MWCrown;
export const TrendingUp = MWTrendingUp;
export const BookOpen = MWBookOpen;
export const Globe = MWGlobe;
export const HeartHandshake = MWHeartHandshake;
export const ArrowLeft = MWArrowLeft;
export const ArrowRight = MWArrowRight;
export const ArrowUp = MWArrowUp;
export const ArrowDown = MWArrowDown;
export const ArrowDownCircle = MWArrowDown;
export const ArrowDownRight = MWArrowDown;
export const ArrowDownToLine = MWArrowDown;
export const ArrowUpCircle = MWArrowUp;
export const ArrowUpRight = MWArrowUp;
export const Plus = MWPlus;
export const X = MWX;
export const Check = MWCheck;
export const CheckCircle = MWCheckCircle2;
export const CheckCircle2 = MWCheckCircle2;
export const CheckCheck = MWCheckCircle2;
export const XCircle = MWX;
export const ChevronRight = MWChevronRight;
export const ChevronLeft = MWChevronLeft;
export const ChevronDown = MWChevronDown;
export const ChevronUp = MWChevronUp;
export const Menu = MWMenu;
export const Search = MWSearch;
export const Filter = MWFilter;
export const Bell = MWBell;
export const BellRing = MWBell;
export const MoreHorizontal = MWMoreHorizontal;
export const Edit = MWEdit;
export const Edit2 = MWEdit;
export const Trash2 = MWTrash2;
export const Copy = MWCopy;
export const Download = MWDownload;
export const Upload = MWUpload;
export const Share2 = MWShare2;
export const RefreshCw = MWRefreshCw;
export const RotateCcw = MWRefreshCw;
export const ExternalLink = MWExternalLink;
export const Eye = MWEye;
export const EyeOff = MWEyeOff;
export const Heart = MWHeart;
export const Star = MWStar;
export const Zap = MWZap;
export const Sparkles = MWSparkles;
export const Circle = MWTarget;
export const Dot = MWTarget;
export const Loader2 = MWLoader2;
export const Droplet = MWDroplet;
export const HeartPulse = MWHeartPulse;
export const FileText = MWFileText;
export const FileSignature = MWFileText;
export const ClipboardList = MWClipboardList;
export const Scan = MWScan;
export const Activity = MWActivity;
export const ShieldCheck = MWShieldCheck;
export const ThermometerSun = MWThermometerSun;
export const MapPin = MWMapPin;
export const Locate = MWMapPin;
export const LocateFixed = MWMapPin;
export const Baby = MWBaby;
export const PawPrint = MWPawPrint;
export const Megaphone = MWMegaphone;
export const Store = MWStore;
export const Briefcase = MWBriefcase;
export const Phone = MWPhone;
export const PhoneCall = MWPhoneCall;
export const Map = MWMap;
export const Navigate = MWNavigate;
export const Compass = MWCompass;
export const Globe2 = MWGlobe2;
export const User = MWUser;
export const UserPlus = MWUserPlus;
export const Trophy = MWTrophy;
export const Medal = MWMedal;
export const CreditCard = MWCreditCard;
export const Receipt = MWReceipt;
export const Coins = MWCoins;
export const DollarSign = MWDollarSign;
export const Clock = MWClock;
export const Clock3 = MWClock3;
export const History = MWHistory;
export const CalendarCheck = MWCalendar;
export const CalendarClock = MWClock;
export const Cloud = MWCloud;
export const CloudOff = MWCloudOff;
export const CloudRain = MWCloudRain;
export const Snowflake = MWSnowflake;
export const Wind = MWWind;
export const Sun = MWSun;
export const Moon = MWMoon;
export const Flame = MWFlame;
export const Image = MWImage;
export const ImageIcon = MWImage;
export const Camera = MWCamera;
export const Monitor = MWMonitor;
export const Smartphone = MWSmartphone;
export const Mic = MWPhone;
export const MicOff = MWPause;
export const VideoOff = MWPause;
export const Pause = MWPause;
export const PauseCircle = MWPauseCircle;
export const Minimize2 = MWPause;
export const Mail = MWMail;
export const Send = MWSend;
export const Languages = MWLanguages;
export const Lock = MWLock;
export const KeyRound = MWKeyRound;
export const ShieldAlert = MWAlertTriangle;
export const Info = MWInfo;
export const HelpCircle = MWHelpCircle;
export const AlertCircle = MWAlertCircle;
export const AlertTriangle = MWAlertTriangle;
export const Layers = MWLayers;
export const List = MWList;
export const PanelLeft = MWPanelLeft;
export const Paperclip = MWPaperclip;
export const Pencil = MWPencil;
export const Percent = MWPercent;
export const Save = MWSave;
export const Scale = MWScale;
export const Tag = MWTag;
export const Target = MWTarget;
export const GripVertical = MWGripVertical;
export const Hash = MWHash;
export const Beaker = MWBeaker;
export const Palette = MWPalette;
export const SlidersHorizontal = MWSlidersHorizontal;
export const Smile = MWSmile;
export const ChefHat = MWChefHat;
export const WifiOff = MWWifiOff;
export const FolderHeart = MWFolderHeart;
export const Coffee = MWCoffee;
export const Minus = MWX;
export const LogIn = MWLogIn;
export const LogOut = MWLogOut;

// ─── Additional Aliases for icons not yet custom-built ────────
// These map to the closest MW custom icon by semantic meaning
export const MessageCircle = MWMessageSquare;
export const Gift = MWCrown;
export const Apple = MWPill;
export const Award = MWMedal;
export const BadgeCheck = MWCheckCircle2;
export const Ban = MWX;
export const Banknote = MWDollarSign;
export const BellOff = MWPause;
export const Bike = MWTruck;
export const Bot = MWSparkles;
export const Brain = MWActivity;
export const Bug = MWAlertTriangle;
export const CalendarDays = MWCalendar;
export const Car = MWTruck;
export const CheckSquare = MWCheckCircle2;
export const Clipboard = MWClipboardList;
export const Crosshair = MWTarget;
export const Database = MWLayers;
export const Droplets = MWDroplet;
export const Edit3 = MWEdit;
export const FileCheck2 = MWFileText;
export const FileImage = MWImage;
export const Gauge = MWBarChart3;
export const GraduationCap = MWBookOpen;
export const HandHeart = MWHeart;
export const Handshake = MWHeartHandshake;
export const IdCard = MWFileText;
export const Inbox = MWMail;
export const Infinity = MWRefreshCw;
export const Key = MWKeyRound;
export const LifeBuoy = MWShield;
export const Lightbulb = MWSparkles;
export const Link2 = MWExternalLink;
export const MapPinPlus = MWMapPin;
export const Microscope = MWFlaskConical;
export const MoreVertical = MWMoreHorizontal;
export const Navigation = MWNavigate;
export const Network = MWGlobe;
export const PlayCircle = MWVideo;
export const PlusCircle = MWPlus;
export const QrCode = MWScan;
export const Route = MWMap;
export const ScanLine = MWScan;
export const Scissors = MWEdit;
export const ShoppingBag = MWPackage;
export const ShoppingCart = MWPackage;
export const Siren = MWAlertTriangle;
export const Sliders = MWSlidersHorizontal;
export const Thermometer = MWThermometerSun;
export const ThumbsUp = MWHeart;
export const Ticket = MWTag;
export const Timer = MWClock;
export const TrendingDown = MWTrendingUp;
export const UserCheck = MWUserPlus;
export const UserCircle = MWUser;
export const Volume2 = MWMegaphone;
export const Wifi = MWWifiOff;
export const Syringe = MWStethoscope;
export const Square = MWX;
export const Stop = MWX;
export const SkipForward = MWChevronRight;
export const SmilePlus = MWSmile;
export const AudioLines = MWActivity;
export const UserCircle2 = MWUser;
export const Flag = MWTrophy;
export const Pin = MWMapPin;
export const PinOff = MWMapPin;
export const MousePointer = MWTarget;
export const Rocket = MWZap;
export const ThermometerSnowflake = MWSnowflake;
export const Signature = MWPencil;
export const MapPinned = MWMapPin;
export const TrafficCone = MWAlertTriangle;
export const Footprints = MWNavigate;
export const TestTube = MWBeaker;
export const Power = MWZap;
export const PowerOff = MWX;
export const Play = MWVideo;
export const CircleDot = MWTarget;
export const Radio = MWActivity;
export const Signal = MWWifiOff;
export const CircleDollarSign = MWWallet;
export const ToggleLeft = MWSlidersHorizontal;
export const ToggleRight = MWSlidersHorizontal;
export const FileEdit = MWPencil;
