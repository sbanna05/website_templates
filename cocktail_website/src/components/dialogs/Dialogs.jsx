import { DIALOGS, useDialog } from "../../context/contexts";
import SignInDialog from "./SignInDialog";
import SignUpDialog from "./SignUpDialog";
import CartDialog from "./CartDialog";

const REGISTRY = {
  [DIALOGS.signIn]: SignInDialog,
  [DIALOGS.signUp]: SignUpDialog,
  [DIALOGS.cart]: CartDialog,
};

/** Renders whichever dialog is open. Adding a dialog = one registry entry. */
export default function Dialogs() {
  const { name, props } = useDialog();
  const Active = REGISTRY[name];
  // `key` remounts when switching dialogs so each one opens fresh.
  return Active ? <Active key={name} {...props} /> : null;
}
