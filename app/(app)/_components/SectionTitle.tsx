type SectionTitleProps = Readonly<{
  eyebrow?: string;
  title: string;
  accentClass?: string;
}>;

export default function SectionTitle({
  eyebrow,
  title,
  accentClass = "text-purple-300",
}: SectionTitleProps) {
  return (
    <div>
      {eyebrow ? (
        <p className={"text-xs font-semibold uppercase tracking-[0.22em] " + accentClass}>{eyebrow}</p>
      ) : null}
      <h2 className={"text-xl font-black uppercase tracking-[0.08em] " + accentClass}>{title}</h2>
    </div>
  );
}
