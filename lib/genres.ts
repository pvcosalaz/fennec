// Single source of truth for the genre catalog. Used by Settings (the Fennec
// ID genre picker) and the /join waitlist form so the two never drift apart.
export const GENRE_OPTIONS = [
  "Trap", "Hip-Hop", "R&B", "Pop", "Reggaeton", "Latin",
  "Electronic", "House", "Techno", "Ambient", "Lo-fi",
  "Jazz", "Soul", "Funk", "Gospel", "Rock", "Indie",
  "Cinematic", "Film/TV", "Experimental", "Classical",
] as const;
