declare module "lucide-react" {
  import * as React from "react";
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    className?: string;
  }
  export type LucideIcon = React.ForwardRefExoticComponent<
    LucideProps & React.RefAttributes<SVGSVGElement>
  >;

  export const ChevronDown: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const ListTodo: LucideIcon;
  export const FileText: LucideIcon;
  export const Download: LucideIcon;
  export const Globe: LucideIcon;
  export const Check: LucideIcon;
  export const Circle: LucideIcon;
  export const CircleDot: LucideIcon;
  export const X: LucideIcon;
  export const Pencil: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Search: LucideIcon;
  export const Save: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Sparkles: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Layers: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Copy: LucideIcon;
  export const Compass: LucideIcon;
  export const Brain: LucideIcon;
  export const ShieldCheck: LucideIcon;
  export const Terminal: LucideIcon;
  export const Cpu: LucideIcon;
  export const Database: LucideIcon;
}
