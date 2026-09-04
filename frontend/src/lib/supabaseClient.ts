import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase project credentials, 
// or preferably use environment variables (e.g., import.meta.env.VITE_SUPABASE_URL)
const supabaseUrl = "https://dnifaxnwicfbzenafysn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaWZheG53aWNmYnplbmFmeXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzc0NTUsImV4cCI6MjEwMzg1MzQ1NX0.3Ankv5FmQ4q_9pdxW_myrvrfRG-68rKpKhj9zAHZU3M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);