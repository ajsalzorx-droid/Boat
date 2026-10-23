// Minimal types for page-flip 2.0.7 (StPageFlip), which ships without typings.
// Only the parts used by src/components/FlipBook.tsx.
declare module "page-flip" {
  export type FlipSetting = {
    startPage: number;
    size: "fixed" | "stretch";
    width: number;
    height: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    drawShadow: boolean;
    flippingTime: number;
    usePortrait: boolean;
    startZIndex: number;
    autoSize: boolean;
    maxShadowOpacity: number;
    showCover: boolean;
    mobileScrollSupport: boolean;
    clickEventForward: boolean;
    useMouseEvents: boolean;
    swipeDistance: number;
    showPageCorners: boolean;
    disableFlipByClick: boolean;
  };

  export type Orientation = "portrait" | "landscape";

  export type PageFlipEvent<T> = { data: T; object: PageFlip };

  export class PageFlip {
    constructor(root: HTMLElement, setting: Partial<FlipSetting>);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    destroy(): void;
    update(): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    getPageCount(): number;
    getCurrentPageIndex(): number;
    getOrientation(): Orientation;
    on(event: "flip", cb: (e: PageFlipEvent<number>) => void): PageFlip;
    on(event: "init", cb: (e: PageFlipEvent<{ page: number; mode: Orientation }>) => void): PageFlip;
    on(event: "changeOrientation", cb: (e: PageFlipEvent<Orientation>) => void): PageFlip;
    on(event: "changeState", cb: (e: PageFlipEvent<string>) => void): PageFlip;
  }
}
