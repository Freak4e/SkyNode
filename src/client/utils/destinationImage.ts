import { useEffect, useState } from "react";

const imageCache = new Map<string, string | undefined>();

export async function fetchDestinationImage(cityName: string, countryName?: string): Promise<string | undefined> {
  const key = `${cityName}|${countryName || ""}`.toLowerCase();

  if (imageCache.has(key)) {
    return imageCache.get(key);
  }

  const candidates = [
    cityName,
    countryName ? `${cityName}, ${countryName}` : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`,
      );

      if (!response.ok) {
        continue;
      }

      const data = await response.json() as {
        originalimage?: { source?: string };
        thumbnail?: { source?: string };
      };
      const imageUrl = data.originalimage?.source || data.thumbnail?.source;

      if (typeof imageUrl === "string" && imageUrl.startsWith("https://")) {
        imageCache.set(key, imageUrl);
        return imageUrl;
      }
    } catch {
      // Try next candidate.
    }
  }

  imageCache.set(key, undefined);
  return undefined;
}

export function useDestinationImage(cityName?: string, countryName?: string): string | undefined {
  const [imageUrl, setImageUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!cityName?.trim()) {
      setImageUrl(undefined);
      return;
    }

    let cancelled = false;

    void fetchDestinationImage(cityName.trim(), countryName).then((url) => {
      if (!cancelled) {
        setImageUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cityName, countryName]);

  return imageUrl;
}

export function tripDisplayCity(trip: { destinationName: string; cities?: Array<{ name: string }> }): string {
  return trip.cities?.[0]?.name || trip.destinationName;
}
