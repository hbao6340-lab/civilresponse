"use client";

/**
 * Browser geolocation helpers. Real GPS only — never simulated in production.
 * Callers must ensure responder verification, duty mode, and consent first.
 */

export interface PositionFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  heading: number | null;
  speedMetersPerSecond: number | null;
  timestamp: number;
}

/** Haversine distance in metres — for approximate UI distances only. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Privacy offset for public display: random perturbation within `meters`.
 * Public map consumers must never treat this as exact.
 */
export function jitterPoint(
  lat: number,
  lng: number,
  meters: number,
): { lat: number; lng: number } {
  const dLat = (meters / 111_000) * (Math.random() * 2 - 1);
  const dLng =
    (meters / (111_000 * Math.cos((lat * Math.PI) / 180))) *
    (Math.random() * 2 - 1);
  return { lat: lat + dLat, lng: lng + dLng };
}

export class GpsTracker {
  private watchId: number | null = null;

  /** Start watcher. Returns a stop function. */
  start(
    onFix: (fix: PositionFix) => void,
    onError?: (err: GeolocationPositionError) => void,
  ): () => void {
    if (!("geolocation" in navigator)) {
      throw new Error("Geolocation is not supported by this browser.");
    }
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onFix({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy ?? null,
          heading: pos.coords.heading ?? null,
          speedMetersPerSecond: pos.coords.speed ?? null,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        onError?.(err);
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => this.stop();
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
