type CardProps = Readonly<{
  children: React.ReactNode;
  className: string;
  // Stable hook for automated tests to address a specific card on a page
  // with many visually-similar ones - optional, no effect on rendering.
  testId?: string;
}>;

export default function Card({ children, className, testId }: CardProps) {
  return (
    <section
      data-testid={testId}
      // Colours now come from the active domain theme, with the original
      // purple values as the fallback so any surface rendered outside a
      // themed shell (and every existing usage) looks exactly as before.
      // The shape, blur, transition and hover behaviour are unchanged.
      className={
        "menace-card relative min-w-0 w-full rounded-2xl border border-[var(--atlas-border,rgb(168_85_247/0.2))] bg-[var(--atlas-surface,rgb(2_6_23/0.55))] shadow-[var(--atlas-glow,0_0_35px_rgba(88,28,135,0.16))] backdrop-blur-xl transition duration-200 hover:border-[rgb(var(--atlas-accent,168_85_247)/0.45)] " +
        className
      }
    >
      {children}
    </section>
  );
}
