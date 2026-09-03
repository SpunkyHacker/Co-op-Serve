import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";


interface AuthContextType {
  session: Session | null;
  loading: boolean;
}


const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});


interface AuthProviderProps {
  children: ReactNode;
}


export function AuthProvider({
  children,
}: AuthProviderProps) {

  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {

    // Get existing session when app starts
    supabase.auth.getSession()
      .then(({ data }) => {

        setSession(data.session);

        setLoading(false);

      });


    // Listen for login/logout/session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {

        setSession(session);

      }
    );


    // Cleanup listener
    return () => {
      subscription.unsubscribe();
    };

  }, []);


  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {

  return useContext(AuthContext);

}