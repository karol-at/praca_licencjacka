import { GdanskDataPoint } from "./GdanskConverter.ts";

const URI = "https://ckan2.multimediagdansk.pl/gpsPositions?v=2";

async function callAPI(): Promise<GdanskDataPoint[]> {
  const res = await fetch(URI);
  const data = await res.json();
  return data.vehicles;
}

export async function getData(
  array: GdanskDataPoint[],
): Promise<GdanskDataPoint[]> {
  const data = await callAPI();
  return array.concat(data);
}
