import { Reveal } from "@/components/motion/reveal";
import { FloatingEmojis } from "@/components/motion/floating-emojis";

export function PageHeader({
  title,
  description,
  emojis,
  children,
}: {
  title: string;
  description?: string;
  emojis?: string[];
  children?: React.ReactNode;
}) {
  return (
    <Reveal>
      <div className="relative mb-8">
        {emojis && emojis.length > 0 && <FloatingEmojis emojis={emojis} />}
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-xl text-sm text-fg-muted sm:text-base">
                {description}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </Reveal>
  );
}
