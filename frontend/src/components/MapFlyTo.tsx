import { useEffect } from "react";
import { useMap } from "react-leaflet";

type Props = { center: [number, number]; zoom: number };

/** Smooth pan/zoom when `center` / `zoom` change (e.g. after geocode). */
export function MapFlyTo({ center, zoom }: Props) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.1 });
  }, [map, center[0], center[1], zoom]);
  return null;
}
