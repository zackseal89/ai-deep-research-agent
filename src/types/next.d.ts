declare module "next" {
  export type Metadata = {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
  export type NextConfig = {
    [key: string]: unknown;
  };
  export type ResolvingMetadata = Promise<Metadata>;
  export type ResolvingViewport = Promise<unknown>;
}

declare module "next/server" {
  export class NextRequest extends Request {
    [key: string]: unknown;
  }
  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    [key: string]: unknown;
  }
}

declare module "next/link" {
  import * as React from "react";
  export interface LinkProps
    extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    replace?: boolean;
    scroll?: boolean;
    prefetch?: boolean;
  }
  const Link: React.ForwardRefExoticComponent<
    LinkProps & React.RefAttributes<HTMLAnchorElement>
  >;
  export default Link;
}

declare module "next/types.js" {
  export type ResolvingMetadata = Promise<import("next").Metadata>;
  export type ResolvingViewport = Promise<unknown>;
}

declare module "next/server.js" {
  export * from "next/server";
}

declare module "next/navigation" {
  export function usePathname(): string;
  export function useRouter(): {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
    forward: () => void;
    refresh: () => void;
    prefetch: (href: string) => void;
  };
  export function useSearchParams(): URLSearchParams;
  export function useParams(): Record<string, string | string[]>;
}
