const GOOGLE_MAPS_SCRIPT_ID = 'pace-google-maps-places-script';

let googleMapsPlacesPromise: Promise<void> | null = null;

function hasGooglePlacesLoaded(): boolean {
  const maps = (globalThis as { google?: { maps?: { places?: unknown } } }).google?.maps;
  return maps?.places != null;
}

function resolveApiKey(): string {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export function ensureGoogleMapsPlacesLoaded(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve();
  }

  if (hasGooglePlacesLoaded()) {
    return Promise.resolve();
  }

  const apiKey = resolveApiKey();
  if (apiKey.length === 0) {
    return Promise.resolve();
  }

  if (googleMapsPlacesPromise != null) {
    return googleMapsPlacesPromise;
  }

  googleMapsPlacesPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript != null) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          googleMapsPlacesPromise = null;
          reject(new Error('Failed to load Google Maps Places script.'));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        googleMapsPlacesPromise = null;
        reject(new Error('Failed to load Google Maps Places script.'));
      },
      { once: true }
    );
    document.head.appendChild(script);
  });

  return googleMapsPlacesPromise;
}
