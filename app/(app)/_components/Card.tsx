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
      className={
        "menace-card relative min-w-0 w-full rounded-2xl border border-purple-500/20 bg-slate-950/55 shadow-[0_0_35px_rgba(88,28,135,0.16)] backdrop-blur-xl transition duration-200 hover:border-purple-400/40 hover:shadow-[0_0_45px_rgba(124,58,237,0.22)] " +
        className
      }
    >
      {children}
    </section>
  );
}
