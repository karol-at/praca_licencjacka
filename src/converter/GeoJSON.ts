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
  const targetDirectory = `${directory}/${today}/${lineId}`;
  try {
    Deno.mkdirSync(targetDirectory, { recursive: true });
  } catch {
    //reached if directory already exists, in that case do nothing
  }
  dataMap.forEach(async (value, key) => {
    if (value.length < 10) return;
    const geoJSON = JSON.stringify({
      type: "FeatureCollection",
      features: value,
    });
    let headsign;
    if (typeof value[0].properties.headsign == "string") {
      headsign = value[0].properties.headsign.replace("[-> ]", "_");
    }
    await Deno.mkdir(`${targetDirectory}/${headsign}`);
    await Deno.writeTextFile(
      `${targetDirectory}/${headsign}/autobus_${key}.geojson`,
      geoJSON,
    );
  });
}

export function getTimestamp(date: string): number {
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
