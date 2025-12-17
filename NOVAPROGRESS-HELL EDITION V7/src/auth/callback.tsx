
import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallback() {
  useEffect(() => {
    // Check for PKCE code in query params or existing session
    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      if (code) {
        // Exchange code for session (PKCE flow)
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.location.href = "/";
        } else {
          window.location.href = "/login";
        }
      } else {
        // Check for implicit flow (hash) or existing session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.href = "/";
        } else {
          // If no session found immediately, redirect to login
          window.location.href = "/login";
        }
      }
    };
    handleAuth();
  }, []);

  return (
    <div style={{ color: "white", padding: 40, fontFamily: "monospace" }}>
      Authenticating...
    </div>
  );
}
