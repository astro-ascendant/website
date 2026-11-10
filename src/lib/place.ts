export interface PlaceOption {
  id: string;
  name: string;
  region?: string;
  country?: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  suburb?: string;
  state?: string;
  country?: string;
  name?: string;
}

interface NominatimEntry {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

function placeName(entry: NominatimEntry): string {
  const address = entry.address;
  return (
    address?.city ??
    address?.town ??
    address?.village ??
    address?.hamlet ??
    address?.suburb ??
    address?.name ??
    entry.display_name.split(",")[0]?.trim() ??
    entry.display_name
  );
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceOption[]> {
  // V1 place search uses OpenStreetMap Nominatim (no API key); users can
  // always override with manual coordinates below.
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" }, signal },
  );
  if (!response.ok) {
    throw new Error("Place search failed.");
  }
  const data = (await response.json()) as NominatimEntry[];
  return data
    .map((entry) => ({
      id: String(entry.place_id),
      name: placeName(entry),
      region: entry.address?.state,
      country: entry.address?.country,
      displayName: entry.display_name,
      latitude: Number(entry.lat),
      longitude: Number(entry.lon),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude),
    );
}

interface NominatimReverse {
  display_name?: string;
  address?: NominatimAddress;
}

/**
 * The place name for a point, e.g. "Chennai, Tamil Nadu, India", or null when
 * the lookup finds nothing. Callers pass coordinates already rounded to the
 * precision they are willing to share.
 */
export async function reversePlace(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${latitude}&lon=${longitude}`,
    { headers: { Accept: "application/json" }, signal },
  );
  if (!response.ok) {
    throw new Error("Place lookup failed.");
  }
  const data = (await response.json()) as NominatimReverse;
  const address = data.address;
  const name =
    address?.city ??
    address?.town ??
    address?.village ??
    address?.hamlet ??
    address?.suburb ??
    address?.name;
  const parts = [name, address?.state, address?.country].filter(
    (part): part is string => typeof part === "string" && part !== "",
  );
  if (parts.length > 0) {
    return parts.join(", ");
  }
  return data.display_name ?? null;
}
