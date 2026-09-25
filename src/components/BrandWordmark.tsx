import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-wordmark relative block overflow-hidden", className)}>
      <Image
        src="/brand/wordmark-light.png"
        alt="xStockLens"
        fill
        sizes="(min-width: 640px) 7rem, 6.5rem"
        className="object-contain object-left dark:hidden"
        priority
      />
      <Image
        src="/brand/wordmark-dark.png"
        alt=""
        fill
        sizes="(min-width: 640px) 7rem, 6.5rem"
        className="hidden object-contain object-left mix-blend-screen dark:block"
        aria-hidden="true"
        priority
      />
    </span>
  );
}
