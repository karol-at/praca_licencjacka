export type TricityDataPoint = {
    generated: string;
    routeShortName: string;
    tripId: number;
    routeId: number;
    headsign: string;
    vechicleCode: string;
    vechicleService: string;
    vehicleId: number;
    speed: number;
    direction: number;
    delay: number;
    scheduledTripStartTime: string;
    lat: number;
    lon: number; 
    gpsQuality: number;
}

