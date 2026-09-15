import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Search } from "lucide-react";
import { getPlaceLocation, searchPlaces, type PlaceSuggestion } from "@/lib/places.functions";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AddressSearchProps {
  onPick: (lng: number, lat: number, label: string) => void;
}

export function AddressSearch({ onPick }: AddressSearchProps) {
  const runSearch = useServerFn(searchPlaces);
  const resolvePlace = useServerFn(getPlaceLocation);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const requestId = useRef(0);
  const sessionToken = useRef(crypto.randomUUID());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const results = await runSearch({ data: { input: q, sessionToken: sessionToken.current } });
        if (id !== requestId.current) return; // stale response
        setSuggestions(results);
        setOpen(true);
      } catch {
        if (id === requestId.current) setSuggestions([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, runSearch]);

  const pick = async (s: PlaceSuggestion) => {
    setOpen(false);
    setLoading(true);
    const token = sessionToken.current;
    sessionToken.current = crypto.randomUUID(); // retire token after selection
    try {
      const place = await resolvePlace({ data: { placeId: s.placeId, sessionToken: token } });
      setQuery(place.label);
      onPick(place.lng, place.lat, place.label);
    } catch {
      toast.error("Couldn't find that address — try a nearby landmark");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder="Search an address or landmark, e.g. Mindspace Madhapur"
        aria-label="Search for your flat's address"
        className="rounded-2xl pl-9 pr-9"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => void pick(s)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent"
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{s.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
