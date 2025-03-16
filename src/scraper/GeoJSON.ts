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
    const geoJSON = JSON.stringify({
      type: "FeatureCollection",
      features: value,
    });
    await Deno.writeTextFile(
      `${targetDirectory}/autobus_${key}.json`,
      geoJSON,
    );
  });
}
