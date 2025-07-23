import "jsr:@std/dotenv/load";
import assert from "node:assert";

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
    line: number;
    time: string;
    startTime: string;
    tripId: number;
    [key: string]: string | number;
  };
};

export function exportGeoJSON(
  dataMap: Map<string | number, GeoJSON[]>,
  today: string,
  lineId: string,
) {
  const directory = Deno.env.get("DIRECTORY") ?? "./results";
  const targetDirectory = `${directory}/${today}`;
  for (const [key, value] of dataMap) {
    const geoJSON = JSON.stringify({
      type: "FeatureCollection",
      features: value,
    });
    let headsign;
    if (typeof value[0].properties.headsign == "string") {
      headsign = value[0].properties.headsign.replaceAll(/[-> ]/g, "_");
    }
    try {
      Deno.mkdirSync(`${targetDirectory}/${headsign}`);
    } catch (_error) {
      //reached if directory exists, in that case do nothing
    }
    Deno.writeTextFileSync(
      `${targetDirectory}/${headsign}/autobus_${key}.geojson`,
      geoJSON,
    );
  }
  console.log(`data converted for ${lineId} for ${today}`);
  return;
}

export function getTimestamp(date: string): number {
  assert(date != "null");
  return date
    .replace(" ", "T")
    .split("T")[1]
    .split(":")
    .map(Number)
    .reduce((p, c, i) => {
      if (i == 0) return c * 3600;
      if (i == 1) return c * 60 + p;
      if (i == 2) return c + p;
      return 0;
    });
}
