type BadgeProps = {
  children: React.ReactNode;
  tone?: "primary" | "accent" | "muted";
};

const toneStyles = {
  primary: "rgba(179, 107, 255, 0.2)",
  accent: "rgba(85, 214, 255, 0.2)",
  muted: "rgba(148, 163, 184, 0.2)",
};

export default function Badge({ children, tone = "primary" }: BadgeProps) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        border: "1px solid rgba(179, 107, 255, 0.4)",
        background: toneStyles[tone],
      }}
    >
      {children}
    </span>
  );
}
