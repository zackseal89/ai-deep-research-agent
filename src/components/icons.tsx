import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
}

function createIcon(d: string, extra?: React.ReactNode) {
  const IconComponent = React.forwardRef<SVGSVGElement, IconProps>(({ size = 16, color = "currentColor", className = "", ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {d && <path d={d} />}
      {extra}
    </svg>
  ));
  IconComponent.displayName = "LucideIcon";
  return IconComponent;
}

// Core navigation & arrows
export const ChevronDown = createIcon("m6 9 6 6 6-6");
export const ChevronUp = createIcon("m18 15-6-6-6 6");
export const ChevronRight = createIcon("m9 18 6-6-6-6");
export const ChevronLeft = createIcon("m15 18-6-6 6-6");
export const ArrowUp = createIcon("m5 12 7-7 7 7", <path d="M12 19V5" />);
export const ArrowDown = createIcon("m19 12-7 7-7-7", <path d="M12 5v14" />);
export const ArrowLeft = createIcon("m12 19-7-7 7-7", <path d="M19 12H5" />);
export const ArrowRight = createIcon("m12 5 7 7-7 7", <path d="M5 12h14" />);

// Basic shapes & actions
export const Check = createIcon("", <polyline points="20 6 9 17 4 12" />);
export const X = createIcon("M18 6 6 18", <path d="m6 6 12 12" />);
export const Plus = createIcon("M5 12h14", <path d="M12 5v14" />);
export const Minus = createIcon("M5 12h14");
export const Square = createIcon("", <rect width="18" height="18" x="3" y="3" rx="2" />);
export const Circle = createIcon("", <circle cx="12" cy="12" r="10" />);
export const CircleDot = createIcon("", [<circle key="c1" cx="12" cy="12" r="10" />, <circle key="c2" cx="12" cy="12" r="1" fill="currentColor" />]);

// Common tools & media
export const Search = createIcon("m21 21-4.3-4.3", <circle cx="11" cy="11" r="8" />);
export const Mic = createIcon("M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z", [<path key="p1" d="M19 10v2a7 7 0 0 1-14 0v-2" />, <line key="l1" x1="12" x2="12" y1="19" y2="22" />]);
export const MessageCircle = createIcon("M7.9 20A9 9 0 1 0 4 16.1L2 22Z");
export const Copy = createIcon("M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", <rect width="12" height="12" x="8" y="8" rx="2" />);
export const Clipboard = createIcon("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />);
export const ClipboardList = createIcon("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2", [<rect key="r" width="8" height="4" x="8" y="2" rx="1" ry="1" />, <path key="p1" d="M12 11h4" />, <path key="p2" d="M12 16h4" />, <path key="p3" d="M8 11h.01" />, <path key="p4" d="M8 16h.01" />]);
export const Edit = createIcon("M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z");
export const Pencil = Edit;
export const Trash = createIcon("M3 6h18", [<path key="p1" d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />, <path key="p2" d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />]);
export const Trash2 = Trash;
export const Loader2 = createIcon("M21 12a9 9 0 1 1-6.219-8.56");
export const RefreshCw = createIcon("M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", [<path key="p1" d="M21 3v5h-5" />, <path key="p2" d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />, <path key="p3" d="M8 16H3v5" />]);
export const RotateCw = createIcon("M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8", <path d="M21 3v5h-5" />);
export const RotateCcw = createIcon("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", <path d="M3 3v5h5" />);
export const Maximize2 = createIcon("M15 3h6v6", [<path key="p1" d="m21 3-7 7" />, <path key="p2" d="M9 21H3v-6" />, <path key="p3" d="m3 21 7-7" />]);
export const ZoomIn = createIcon("m21 21-4.3-4.3", [<circle key="c" cx="11" cy="11" r="8" />, <line key="l1" x1="11" x2="11" y1="8" y2="14" />, <line key="l2" x1="8" x2="14" y1="11" y2="11" />]);
export const ZoomOut = createIcon("m21 21-4.3-4.3", [<circle key="c" cx="11" cy="11" r="8" />, <line key="l" x1="8" x2="14" y1="11" y2="11" />]);

// Files & Content
export const FileText = createIcon("M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", [<path key="p1" d="M14 2v4a2 2 0 0 0 2 2h4" />, <path key="p2" d="M10 9H8" />, <path key="p3" d="M16 13H8" />, <path key="p4" d="M16 17H8" />]);
export const File = createIcon("M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", <path d="M14 2v4a2 2 0 0 0 2 2h4" />);
export const Download = createIcon("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", [<polyline key="pl" points="7 10 12 15 17 10" />, <line key="l" x1="12" x2="12" y1="15" y2="3" />]);
export const ExternalLink = createIcon("M15 3h6v6", [<path key="p1" d="M10 14 21 3" />, <path key="p2" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />]);
export const Globe = createIcon("M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", [<circle key="c" cx="12" cy="12" r="10" />, <path key="p" d="M2 12h20" />]);
export const Globe2 = Globe;
export const BookOpen = createIcon("M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z", <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />);
export const Save = createIcon("M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", [<path key="p1" d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />, <path key="p2" d="M7 3v4a1 1 0 0 0 1 1h7" />]);

// Feedback & controls
export const ThumbsUp = createIcon("M7 10v12", [<path key="p1" d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />]);
export const ThumbsDown = createIcon("M17 14V2", [<path key="p1" d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />]);
export const Volume2 = createIcon("M11 5 6 9H2v6h4l5 4V5Z", [<path key="p1" d="M15.54 8.46a5 5 0 0 1 0 7.07" />, <path key="p2" d="M19.07 4.93a10 10 0 0 1 0 14.14" />]);
export const ListTodo = createIcon("M13 6h8", [<rect key="r" x="3" y="5" width="6" height="6" rx="1" />, <path key="p1" d="m3 17 2 2 4-4" />, <path key="p2" d="M13 12h8" />, <path key="p3" d="M13 18h8" />]);
export const ListChecks = createIcon("M13 6h8", [<path key="p1" d="m3 17 2 2 4-4" />, <path key="p2" d="m3 7 2 2 4-4" />, <path key="p3" d="M13 12h8" />, <path key="p4" d="M13 18h8" />]);

// Full Icon Suffix Aliases (for CopilotKit / Lucide-React compatibility)
export const CheckIcon = Check;
export const ChevronRightIcon = ChevronRight;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const CircleIcon = Circle;
export const CircleDotIcon = CircleDot;
export const PlusIcon = Plus;
export const MinusIcon = Minus;
export const XIcon = X;
export const ArrowUpIcon = ArrowUp;
export const ArrowDownIcon = ArrowDown;
export const CopyIcon = Copy;
export const EditIcon = Edit;
export const Loader2Icon = Loader2;
export const MessageCircleIcon = MessageCircle;
export const RefreshCwIcon = RefreshCw;
export const RotateCwIcon = RotateCw;
export const RotateCcwIcon = RotateCcw;
export const Maximize2Icon = Maximize2;
export const ZoomInIcon = ZoomIn;
export const ZoomOutIcon = ZoomOut;
export const SaveIcon = Save;
export const SearchIcon = Search;
export const ThumbsUpIcon = ThumbsUp;
export const ThumbsDownIcon = ThumbsDown;
export const Volume2Icon = Volume2;
export const FileTextIcon = FileText;
export const DownloadIcon = Download;
export const GlobeIcon = Globe;
export const Globe2Icon = Globe2;
export const ListTodoIcon = ListTodo;
export const ListChecksIcon = ListChecks;
export const ClipboardIcon = Clipboard;
export const ClipboardListIcon = ClipboardList;
export const ExternalLinkIcon = ExternalLink;
export const BookOpenIcon = BookOpen;

export default {
  Check, CheckIcon,
  ChevronRight, ChevronRightIcon,
  ChevronLeft, ChevronLeftIcon,
  ChevronDown, ChevronDownIcon,
  ChevronUp, ChevronUpIcon,
  Circle, CircleDot,
  Plus, Minus, X,
  ArrowUp, ArrowDown,
  Copy, Edit, Pencil,
  Loader2, MessageCircle, RefreshCw, RotateCw,
  Save, Search, ThumbsUp, ThumbsDown, Volume2,
  FileText, File, Download, ExternalLink,
  Globe, Globe2, BookOpen,
  ListTodo, ListChecks,
  Clipboard, ClipboardList,
};
