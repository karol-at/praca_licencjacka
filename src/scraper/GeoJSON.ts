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
    startTime: string;
    tripId: number;
  };
};


export function exportGeoJSON(dataMap: Map<string, GeoJSON[]>, today: string, lineId: string) {
  const directory = Deno.env.get("DIRECTORY") ?? "./results";
  const targetDirectory = `${directory}/${today}/`;
  Deno.mkdirSync(targetDirectory, { recursive: true });
  dataMap.forEach(async (value, key) => {
    const geoJSON = JSON.stringify({
      type: "FeatureCollection",
      features: value,
    });
    await Deno.writeTextFile(`${directory}/${today}/${lineId}/autobus_${key}.json`, geoJSON);
  });
}
