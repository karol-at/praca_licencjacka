from numpy import Infinity
import arcpy
import os
import env
import config
from utils import sanitize_str
from route import Route


# TODO: Oddzielne warstwy dla każdego shape id, dopasować na podstawie najbliższego dopasowania na starcie


def join_line(path: str, route: Route):
    """
    Join data from a line to corresponding bus stops. 
    Args:
        path (str): path to the current working directory
        route (Route): a _Route_ object containing information about GTFS Schedule shapes to be joined
    """

    current_layer_dir = f'{path}\\{sanitize_str(config.route_aliases[route.headsign] if route.headsign in config.route_aliases else route.headsign)}'

    rides = os.listdir(current_layer_dir)

    rides_count = len(rides)
    for i, ride in enumerate(rides):
        try:
            json_features = arcpy.conversion.JSONToFeatures(
                f'{current_layer_dir}\\{ride}', f'{route.validated_headsign}_{i}', 'POINT')
        except arcpy.ExecuteError as exception:
            try:
                arcpy.management.Delete(f'{route.validated_headsign}_{i}')
            except:
                pass
            env.errors.append(exception)
            continue

        field_names_list = list(
            map(lambda x: x.baseName,
                arcpy.ListFields(json_features)
                )
        )

        analysis_fields = ['timestamp', 'startTime',
                           'delay', 'startTimestamp'] if 'startTime' in field_names_list else 'timestamp'

        arcpy.management.DeleteField(
            json_features, analysis_fields, 'KEEP_FIELDS')

        # List of shapes that are not the closest one
        incorrect_shapes: list[str] = []
        # Delay between the currently observed trip and the closest timetable
        smallest_trip_delay: int = 86400
        # ID of the trip with the smallest delay
        smallest_delay_id = None
        # Shape ID of the shape with the smallest delay
        smallest_delay_shape_id = None

        for shape in route.shapes:
            join_layer_name = f'{shape.validated_id}_j'
            arcpy.analysis.SpatialJoin(
                shape.validated_id,
                json_features,
                join_layer_name,
                'JOIN_ONE_TO_ONE',
                'KEEP_ALL',
                search_radius='150 Meters',
                match_option='CLOSEST'
            )

            # drop table if more than five stops didn't find a coresponding bus location
            null_count = 0
            bad_match = False
            for row in arcpy.da.SearchCursor(join_layer_name, f'timestamp'):
                if row[0] is None:
                    null_count += 1
                if null_count > 5:
                    incorrect_shapes += [shape.validated_id]
                    bad_match = True
                    break
            if bad_match:
                continue
            delay: tuple[int, int] = calculate_trip_delay(join_layer_name)
            if delay[1] < smallest_trip_delay:
                smallest_delay_id = delay[0]
                smallest_trip_delay = delay[1]
                if smallest_delay_shape_id is not None:
                    incorrect_shapes += [smallest_delay_shape_id]
                smallest_delay_shape_id = shape.validated_id
            else:
                incorrect_shapes += [shape.validated_id]

        for incorrect_shape in incorrect_shapes:
            arcpy.management.Delete(f'{incorrect_shape}_j')

        # Continue to next loop iteration if no good match
        if smallest_delay_shape_id is None:
            print(
                f'processed line {route.headsign}, iteration {i + 1} out of {rides_count}', end='\r')
            arcpy.management.Delete(json_features)
            continue

        join_layer_name = f'{smallest_delay_shape_id}_j'

        arcpy.management.CalculateField(
            join_layer_name, f'delay_{i}', f'!timestamp! - !arrival_time_{smallest_delay_id}!')

        arcpy.management.DeleteField(
            join_layer_name, ['TARGET_FID', 'Join_Count'])
        arcpy.management.Delete(smallest_delay_shape_id)
        arcpy.management.Delete(json_features)
        arcpy.management.Rename(join_layer_name, smallest_delay_shape_id)
        arcpy.management.AlterField(smallest_delay_shape_id, 'timestamp', f'timestamp_{i}')
        try:
            arcpy.management.AlterField(smallest_delay_shape_id, 'startTimestamp', f'startTimestamp_{i}')
            arcpy.management.AlterField(
                smallest_delay_shape_id, 'startTime', f'startTime_{i}')
            arcpy.management.AlterField(
                smallest_delay_shape_id, 'delay', f'delay_ZTM_{i}')
        except:
            pass
        print(
            f'processed line {route.headsign}, iteration {i + 1} out of {rides_count}', end='\r')
    print()


def calculate_trip_delay(join_layer_name: str) -> tuple[int, int]:
    """
    Calculate trip delay based on finding the closest trip
    Args:
        join_layer_name (str): the name of the layer containing joined data
    Returns:
        a tuple containing the id of the closest trip and the difference at first stop
    """
    fields: list[str] = list(map(lambda x: x.baseName,
                                 arcpy.ListFields(join_layer_name, 'arrival_time_*'))) + ['timestamp']
    stop_threshold = 1
    # find the closest trip based on the second stop's schedule (increases up to fourth stop)
    for j, row in enumerate(arcpy.da.SearchCursor(join_layer_name, fields)):
        if j != stop_threshold:
            continue
        if row[-1] is None and stop_threshold <= 5:
            stop_threshold += 1
            continue
        trips = list(filter(None, row[1:]))
        timestamp = row[-1]
        trip_id = get_closest_trip(trips, timestamp)
        return (trip_id, abs(trips[trip_id] - timestamp))
    raise ValueError('not null row not found in table under defined threshold')


def get_closest_trip(arr: list[int | float], target: int | float) -> int:
    """
    Returns the index of the value in arr closest to target.
    Assumes arr is sorted in ascending order.
    """
    left, right = 0, len(arr) - 1
    if target <= arr[left]:
        return left
    if target >= arr[right]:
        return right

    while left < right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid

    if left > 0 and abs(arr[left] - target) >= abs(arr[left - 1] - target):
        return left - 1
    return left


def export_table(table: str, path: str, trip: str):
    """
    Export table as csv file
    Args:
        table (str): path to the table in the geodatabase
        path (str): current daily working directory
        trip (str): name of the exported trip
    """
    arcpy.conversion.ExportTable(
        table, f'{path}\\{arcpy.ValidateTableName(trip)}.csv')


def join_ride(ride: str, route: Route):
    for shape in route.shapes:
        arcpy.analysis.SpatialJoin()
