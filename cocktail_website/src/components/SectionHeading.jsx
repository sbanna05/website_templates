export default function SectionHeading({ eyebrow, title, lead, as = "h2", id, align = "center" }) {
  const Tag = as;
  return (
    <header className={`section-heading section-heading--${align}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Tag className="section-title" id={id}>
        {title}
      </Tag>
      {lead && <p className="section-lead">{lead}</p>}
    </header>
  );
}
