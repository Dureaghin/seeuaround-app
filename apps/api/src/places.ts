export type PlaceHit = { name: string; subtitle: string };

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export async function searchPlaces(
  query: string,
  area: string,
): Promise<{ places: PlaceHit[]; source: "google" | "openstreetmap" }> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (key) {
    const places = await searchGoogle(query, area, key);
    if (places) return { places, source: "google" };
  }
  return { places: await searchNominatim(query, area), source: "openstreetmap" };
}

const barCache = new Map<string, { at: number; places: PlaceHit[]; source: "google" | "openstreetmap" }>();

/** Top bars and restaurants in the town, best-rated when Google is configured. */
export async function suggestBars(
  area: string,
): Promise<{ places: PlaceHit[]; source: "google" | "openstreetmap" }> {
  const keyName = area.trim().toLowerCase();
  const cached = barCache.get(keyName);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
    return { places: cached.places, source: cached.source };
  }
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  let found: { places: PlaceHit[]; source: "google" | "openstreetmap" } | null = null;
  if (key) {
    const places = await searchGoogleBars(area, key);
    if (places?.length) found = { places, source: "google" };
  }
  if (!found) found = { places: await searchOsmBars(area), source: "openstreetmap" };
  barCache.set(keyName, { at: Date.now(), ...found });
  return found;
}

async function searchGoogle(query: string, area: string, key: string): Promise<PlaceHit[] | null> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({
        textQuery: `${query} in ${area}`,
        pageSize: 5,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: {
        displayName?: { text?: string };
        formattedAddress?: string;
        primaryTypeDisplayName?: { text?: string };
      }[];
    };
    return (data.places ?? [])
      .map((place) => ({
        name: place.displayName?.text?.trim() ?? "",
        subtitle: [place.primaryTypeDisplayName?.text, place.formattedAddress]
          .filter(Boolean)
          .join(" · "),
      }))
      .filter((place) => place.name)
      .slice(0, 4);
  } catch {
    return null;
  }
}

async function searchNominatim(query: string, area: string): Promise<PlaceHit[]> {
  const url = new URL(NOMINATIM);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", `${query}, ${area}`);
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url, {
    headers: { "User-Agent": "SeeUAround/1.0 (https://seeuaround.com)" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    name?: string;
    display_name?: string;
    type?: string;
    class?: string;
    address?: { road?: string; suburb?: string };
  }[];
  const venue = data.filter((row) =>
    ["amenity", "shop", "tourism", "leisure", "craft"].includes(row.class ?? ""),
  );
  const rows = venue.length > 0 ? venue : data.filter((row) => row.class !== "boundary");
  const seen = new Set<string>();
  const places: PlaceHit[] = [];
  for (const row of rows) {
    const name = (row.name || row.display_name?.split(",")[0] || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const kind = row.type && row.type !== "yes" ? row.type.replaceAll("_", " ") : "";
    const street = row.address?.road || row.address?.suburb || "";
    places.push({
      name,
      subtitle: [kind, street].filter(Boolean).join(" · "),
    });
    if (places.length === 10) break;
  }
  return places;
}

async function searchGoogleBars(area: string, key: string): Promise<PlaceHit[] | null> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.rating",
      },
      body: JSON.stringify({
        textQuery: `best bars and restaurants in ${area}`,
        pageSize: 12,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: {
        displayName?: { text?: string };
        formattedAddress?: string;
        primaryTypeDisplayName?: { text?: string };
        rating?: number;
      }[];
    };
    return (data.places ?? [])
      .map((place) => ({
        name: place.displayName?.text?.trim() ?? "",
        subtitle: [place.primaryTypeDisplayName?.text, place.formattedAddress]
          .filter(Boolean)
          .join(" · "),
        rating: place.rating ?? 0,
      }))
      .filter((place) => place.name)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)
      .map(({ name, subtitle }) => ({ name, subtitle }));
  } catch {
    return null;
  }
}

async function searchOsmBars(area: string): Promise<PlaceHit[]> {
  try {
    const geoUrl = new URL(NOMINATIM);
    geoUrl.searchParams.set("format", "jsonv2");
    geoUrl.searchParams.set("q", area);
    geoUrl.searchParams.set("limit", "1");
    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": "SeeUAround/1.0 (https://seeuaround.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!geoRes.ok) return searchNominatim("bar", area);
    const geos = (await geoRes.json()) as { lat?: string; lon?: string; boundingbox?: string[] }[];
    const geo = geos[0];
    const box = geo?.boundingbox?.map(Number);
    if (!geo?.lat || !geo?.lon || !box || box.length !== 4 || box.some((n) => Number.isNaN(n))) {
      return searchNominatim("bar", area);
    }
    const [south, north, west, east] = box;
    const local = north - south < 0.45 && east - west < 0.6;
    const where = local
      ? `(${south},${west},${north},${east})`
      : `(around:6000,${geo.lat},${geo.lon})`;
    const query = `[out:json][timeout:12];(node["amenity"~"^(bar|pub|restaurant)$"]${where};way["amenity"~"^(bar|pub|restaurant)$"]${where};);out center 40;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SeeUAround/1.0 (https://seeuaround.com)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(14000),
    });
    if (!res.ok) return searchNominatim("bar", area);
    const data = (await res.json()) as {
      elements?: { tags?: Record<string, string> }[];
    };
    const seen = new Set<string>();
    const places: PlaceHit[] = [];
    for (const row of data.elements ?? []) {
      const name = row.tags?.name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const amenity = row.tags?.amenity ?? "";
      const kind =
        amenity === "pub" ? "Pub" : amenity === "restaurant" ? "Restaurant" : "Bar";
      const street = row.tags?.["addr:street"] || "";
      places.push({ name, subtitle: [kind, street].filter(Boolean).join(" · ") });
      if (places.length === 10) break;
    }
    return places.length ? places : searchNominatim("bar", area);
  } catch {
    return searchNominatim("bar", area);
  }
}
