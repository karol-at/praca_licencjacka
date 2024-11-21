import { LocationDataPoint } from "./APIHelper.ts";
import "jsr:@std/dotenv/load";

export type GeoJSON = {
  type: "Feature";
  geometry: {
    type:
      | "Point"
      | "LineString"
      | "Polygon"
      | "MultiPoint"
      | "MultiLineString"
      | "MultiPolygon";
    coordinates: [number, number];
  };
  properties: {
    type: 1 | 2;
    line: string;
    vehicleNumber: string;
    time: string;
  };
};

export function convertToGeoJSON(data: LocationDataPoint[]): GeoJSON[] {
  return data.map((point) => {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.Lon, point.Lat],
      },
      properties: {
        type: 1,
        line: point.Lines,
        vehicleNumber: point.VehicleNumber,
        time: point.Time,
      },
    };
  });
}

function ifVNExists(item: GeoJSON, map: Map<string, GeoJSON[]>): GeoJSON[] {
  const value = map.get(item.properties.vehicleNumber) ?? [];
  value.push(item);
  return value;
}

export function mapByVNumbers(data: GeoJSON[], map: Map<string, GeoJSON[]>) {
  data.forEach((item) => {
    map.set(item.properties.vehicleNumber, ifVNExists(item, map));
  });
}

export function exportGeoJSON(dataMap: Map<string, GeoJSON[]>, today: string) {
  const directory = Deno.env.get("DIRECTORY") ?? "./results";
  const targetDirectory = `${directory}/${today}/`;
  Deno.mkdirSync(targetDirectory, { recursive: true });
  dataMap.forEach((value, key) => {
    const geoJSON = JSON.stringify({
      type: "FeatureCollection",
      features: value,
    });
    Deno.writeTextFile(`${directory}/${today}/autobus_${key}.json`, geoJSON);
  });
}
