//=============================
// SUPABASE CONFIGURATION
//=============================

const SUPABASE_URL = "https://uwfjtnirfqufgbifeabj.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Zmp0bmlyZnF1ZmdiaWZlYWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTk4MDEsImV4cCI6MjA5OTg5NTgwMX0.KbkDRz7RVxJmVFFvAx6h5WLoAyc0LlJqnhV6i5hrLvM";

if (typeof window === "undefined" || !window.supabase) {
	throw new Error("Load the Supabase browser SDK before this module.");
}

export const supabase = window.supabase.createClient(
	SUPABASE_URL,
	SUPABASE_ANON_KEY
);

export { SUPABASE_URL, SUPABASE_ANON_KEY };