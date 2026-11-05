import { useState } from "react";
import Field from "../../components/Field";
import SectionHeading from "../../components/SectionHeading";
import { SECTIONS } from "../../config/navigation";
import { useAuth } from "../../context/contexts";

const CONTACT_INFO = [
  { icon: "ri-mail-line", label: "Email", value: "hello@cocktailheaven.example", href: "mailto:hello@cocktailheaven.example" },
  { icon: "ri-phone-line", label: "Phone", value: "+00 001 0012", href: "tel:+000010012" },
  { icon: "ri-map-pin-line", label: "Address", value: "123 Cocktail St, Mixology City, CO 12345" },
];

export default function Contact() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    setSent(true);
  };

  return (
    <section id={SECTIONS.contact} className="section section--band" aria-labelledby="contact-title">
      <div className="container contact">
        <div className="contact__intro">
          <SectionHeading
            id="contact-title"
            align="start"
            eyebrow="Say hello"
            title="Feel free to contact us"
            lead="Questions, private events or feedback – we read every message."
          />
          <ul className="contact__info">
            {CONTACT_INFO.map(({ icon, label, value, href }) => (
              <li key={label}>
                <i className={icon} aria-hidden="true" />
                <span>
                  <span className="contact__label">{label}</span>
                  {href ? <a href={href}>{value}</a> : value}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <form className="form contact__form page" onSubmit={handleSubmit} onChange={() => sent && setSent(false)}>
          <Field label="Your name" name="name" autoComplete="name" required defaultValue={user?.username ?? ""} key={user?.username} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" />
          <Field label="Message" name="message" as="textarea" rows={5} required />
          <button type="submit" className="btn btn--primary">
            <i className="ri-send-plane-line" aria-hidden="true" /> Send message
          </button>
          <p className="form__status" role="status">
            {sent && (
              <>
                <i className="ri-checkbox-circle-line" aria-hidden="true" /> Thanks! Your message has been sent (demo).
              </>
            )}
          </p>
        </form>
      </div>
    </section>
  );
}
