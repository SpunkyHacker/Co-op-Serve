import { useEffect } from 'react';

export function useWorkerLocationTracker(workerId, isAvailable) {
  useEffect(() => {
    if (!isAvailable || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          await fetch('http://localhost:8000/api/workers/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worker_id: workerId, lat, lng })
          });
        } catch (err) {
          console.error("Failed to sync worker location:", err);
        }
      },
      (error) => console.error("Worker GPS error:", error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [workerId, isAvailable]);
}