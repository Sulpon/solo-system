type ThemeSectionProps = Readonly<{
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
}>;

// A titled region inside a themed page. Deliberately not built on Card.tsx:
// Card is a self-contained panel with its own purple-keyed border, hover
// state and blur, and nesting page sections inside it produced the
// "everything is a card" look the brief calls out. A section is structure;
// a Card is an object on the page. Both still key off the same accent
// variable, so they belong to one system.
export default function ThemeSection({ title, eyebrow, description, actions, children, className = "", testId }: ThemeSectionProps) {
  return (
    <section data-testid={testId} className={"min-w-0 " + className}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="atlas-accent text-[0.65rem] font-semibold uppercase tracking-[0.26em]">{eyebrow}</p> : null}
          <h2 className="atlas-display mt-1 text-lg font-bold tracking-tight text-white">{title}</h2>
          {description ? <p className="atlas-muted mt-1 text-sm">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {children}
    </section>
  );
}
