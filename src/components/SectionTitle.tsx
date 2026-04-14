export default function SectionTitle({
  children, noBorder,
}: {
  children: React.ReactNode; noBorder?: boolean;
}) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-widest${noBorder ? "" : " pb-3"}`}
      style={{
        color: "#94a3b8",
        ...(noBorder ? {} : { borderBottom: "1px solid #f1f5f9" }),
      }}
    >
      {children}
    </h3>
  );
}
