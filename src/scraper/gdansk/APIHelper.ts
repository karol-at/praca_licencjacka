import { GdanskDataPoint } from "./GdanskConverter.ts";

const URI = "https://ckan2.multimediagdansk.pl/gpsPositions?v=2";

async function callAPI(): Promise<GdanskDataPoint[]> {
  const res = await fetch(URI);
  const data = await res.json();
  return data.vehicles;
}

export async function getData(
  lines: number[],
): Promise<GdanskDataPoint[]> {
  const data = await callAPI();
  return data.filter(item => lines.includes(item.routeId))
}
