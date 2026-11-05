import { useState } from "react";
import Modal from "../Modal";
import Field from "../Field";
import { DIALOGS, useAuth, useDialog } from "../../context/contexts";

export default function SignInDialog({ message }) {
  const { signIn } = useAuth();
  const { open, close } = useDialog();
  const [username, setUsername] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!username.trim()) return;
    signIn(username);
    close();
  };

  return (
    <Modal title="Welcome back" onClose={close} size="sm">
      {message && (
        <p className="notice" role="status">
          <i className="ri-information-line" aria-hidden="true" /> {message}
        </p>
      )}
      <form className="form" onSubmit={handleSubmit}>
        <Field label="Username" name="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <label className="checkbox">
          <input type="checkbox" name="remember" /> Remember me
        </label>
        <button type="submit" className="btn btn--primary btn--block">
          Sign in
        </button>
      </form>
      <p className="modal__footer">
        New here?{" "}
        <button type="button" className="link-btn" onClick={() => open(DIALOGS.signUp)}>
          Create an account
        </button>
      </p>
      <p className="hint">Demo mode – any username and password will do.</p>
    </Modal>
  );
}
