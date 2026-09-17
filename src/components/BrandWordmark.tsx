import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("brand-wordmark relative block overflow-hidden", className)}>
      <Image
        src="/brand/wordmark-light.png"
        alt="xStockLens"
        fill
        sizes="15rem"
        className="object-cover object-center dark:hidden"
        priority
      />
      <Image
        src="/brand/wordmark-dark.png"
        alt=""
        fill
        sizes="15rem"
        className="hidden object-cover object-center mix-blend-screen dark:block"
        aria-hidden="true"
        priority
      />
    </span>
  );
}
