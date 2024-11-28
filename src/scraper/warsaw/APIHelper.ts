import { WarsawDataPoint } from "./WarsawConverter.ts"
import "jsr:@std/dotenv/load"

const resource_id = "20f2e5503e-927d-4ad3-9500-4ab9e55deb59"

export async function callAPI(URI: string): Promise<WarsawDataPoint[]> {
  const res: Response = await fetch(URI);
  const data = await res.json();
  if (typeof (data.result) === "string") {
    return await callAPI(URI);
  }
  return data.result;
}

export function buildConnectionString(
  key: string,
  type: 1 | 2,
  line: number,
): string {
  return `https://api.um.warszawa.pl/api/action/busestrams_get/?resource_id=${resource_id}&apikey=${key}&type=${type}&line=${line}`;
}

export async function getData(
  type: 1 | 2,
  line: number,
  array: WarsawDataPoint[],
): Promise<WarsawDataPoint[]> {
  const URI = buildConnectionString(Deno.env.get("APIKEY") ?? "", type, line);
  const data = await callAPI(URI);
  return array.concat(data)
}