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
  return rows
    .map((row) => {
      const name = (row.name || row.display_name?.split(",")[0] || "").trim();
      const kind = row.type && row.type !== "yes" ? row.type.replaceAll("_", " ") : "";
      const street = row.address?.road || row.address?.suburb || "";
      return {
        name,
        subtitle: [kind, street].filter(Boolean).join(" · "),
      };
    })
    .filter((place) => place.name)
    .slice(0, 4);
}
