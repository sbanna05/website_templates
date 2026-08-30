function Contact({ onSubmit, user }) {
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const messageData = {
      sender_name: formData.get("name"),
      sender_email: formData.get("email"),
      sender_phone: formData.get("phone"),
      message: formData.get("message"),
    };
    onSubmit(messageData);
    e.target.reset();
  };

  return (
    <section id="contact-us" className="container contact-us_container grid">
      <div className="contact-us_title section_title">
        Feel Free To Contact Us
      </div>

      <div className="contact-us_info">
        <p className="contact-us_info_title">General Contact Informations</p>
        <p className="contact-us_info_p">Email: basic_email@email.com</p>
        <p className="contact-us_info_p">Phone: +00 001 0012</p>
        <p className="contact-us_info_p">
          Address: 123 Cocktail St, Mixology City, CO 12345
        </p>
      </div>

      <p className="form_info">
        If you have any questions or feedback, feel free to reach out to us!
      </p>

      <form className="contact-us_form" onSubmit={handleFormSubmit}>
        <input
          type="text"
          name="name"
          defaultValue={user ? user.username : ""}
          className="contact-us_input"
          placeholder="Your Name"
          required
        />
        <input
          type="email"
          name="email"
          defaultValue={user ? user.email : ""}
          className="contact-us_input"
          placeholder="Your Email"
          required
        />
        <input
          type="tel"
          name="phone"
          className="contact-us_input"
          placeholder="Your Phone Number"
          required
        />
        <textarea
          name="message"
          className="contact-us_textarea"
          placeholder="Your Message"
          required
        />
        <button type="submit" className="contact-us_button">
          Send Message
        </button>
      </form>
    </section>
  );
}

export default Contact;
