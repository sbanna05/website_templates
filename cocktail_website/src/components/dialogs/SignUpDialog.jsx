import Modal from "../Modal";
import Field from "../Field";
import { DIALOGS, useDialog } from "../../context/contexts";

export default function SignUpDialog() {
  const { open, close } = useDialog();

  const handleSubmit = (event) => {
    event.preventDefault();
    open(DIALOGS.signIn, { message: "Account created – you can sign in now." });
  };

  return (
    <Modal title="Create an account" onClose={close} size="sm">
      <form className="form" onSubmit={handleSubmit}>
        <Field label="Username" name="username" autoComplete="username" required />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={6} required />
        <button type="submit" className="btn btn--primary btn--block">
          Sign up
        </button>
      </form>
      <p className="modal__footer">
        Already have an account?{" "}
        <button type="button" className="link-btn" onClick={() => open(DIALOGS.signIn)}>
          Sign in
        </button>
      </p>
    </Modal>
  );
}
