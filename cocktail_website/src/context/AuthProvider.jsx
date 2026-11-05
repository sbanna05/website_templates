import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./contexts";

/** Demo authentication – any username signs in (portfolio project, no backend). */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signIn = useCallback((username) => setUser({ username: username.trim() }), []);
  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);
  return <AuthContext value={value}>{children}</AuthContext>;
}
