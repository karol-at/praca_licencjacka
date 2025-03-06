import { TricityDataPoint } from "./TricityConverter.ts";

const URI = "https://ckan2.multimediagdansk.pl/gpsPositions?v=2";

async function callAPI(): Promise<TricityDataPoint[]> {
  const res = await fetch(URI);
  const data = await res.json();
  return data.vehicles;
}

export async function getData(
  lines: number[]
): Promise<TricityDataPoint[]> {
  const data = await callAPI();
  return data.filter(item => lines.includes(item.routeId))
}
