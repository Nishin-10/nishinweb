import { Reveal } from "@/components/motion/reveal";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
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
    </Reveal>
  );
}
