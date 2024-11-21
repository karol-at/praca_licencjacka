export type LocationDataPoint = {
  Lines: string;
  Lon: number;
  Lat: number;
  Time: string;
  Brigade: string;
  VehicleNumber: string;
};

export async function callAPI(URI: string): Promise<LocationDataPoint[]> {
  const res: Response = await fetch(URI);
  const data = await res.json();
  if (typeof (data.result) === "string") {
    return await callAPI(URI);
  }
  return data.result;
}

export function buildConnectionString(
  id: string,
  key: string,
  type: 1 | 2,
  line: number,
): string {
  return `https://api.um.warszawa.pl/api/action/busestrams_get/?resource_id=${id}&apikey=${key}&type=${type}&line=${line}`;
}
