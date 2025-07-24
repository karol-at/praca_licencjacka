import arcpy
import os
from utils import sanitize_str


# TODO: data from stop_preparator => spatial join => calculate results => df/csv

def join_line(path: str, layer: str) :
    """
    Join data from a line to corresponding bus stops. 
    Args:
        path (str): path to the current working directory
        layer (str): name of the layer and bus line being connected
    Returns:
        t
    """
    current_layer_dir = f'{path}\\{sanitize_str(layer)}'
    rides = os.listdir(current_layer_dir)
    layer = arcpy.ValidateTableName(layer)
    for i, ride in enumerate(rides):
        json_features = arcpy.conversion.JSONToFeatures(
            f'{current_layer_dir}\\{ride}', f'{layer}_{i}', 'POINT')
        
        # TODO: index scheduled start time, add calculated delay
        arcpy.management.DeleteField(json_features, ['timestamp', 'startTime', 'delay'] if 'startTime' in arcpy.ListFields(
            json_features) else 'timestamp', 'KEEP_FIELDS')

        join_layer_name = f'{layer}_j'

        arcpy.analysis.SpatialJoin(
            layer, json_features, join_layer_name, 'JOIN_ONE_TO_ONE', 'KEEP_ALL', search_radius='30 Meters', match_option='CLOSEST')
        fields: list[str] = list(map(lambda x: x.baseName,
                                     arcpy.ListFields(join_layer_name, 'trip_*'))) + ['timestamp']

        try: 
            arcpy.management.AlterField(layer, 'startTime', f'startTime_{i}')
            arcpy.management.AlterField(layer, 'delay', f'delay_ZTM_{i}')
        except:
            pass

        # drop table if more than three stops didn't find a coresponding bus location
        null_count = 0
        for row in arcpy.da.SearchCursor(join_layer_name, f'timestamp'):
            if row[0] is None:
                null_count += 1
            if null_count > 3:
                break
        if null_count <= 3:
            calculate_trip_delay(i, join_layer_name, fields)
        arcpy.management.Delete(layer)
        arcpy.management.Rename(join_layer_name, layer)
        arcpy.management.DeleteField(layer, 'timestamp')
    filter_fields = arcpy.ListFields(layer, 'delay_*')
    filter_fields += arcpy.ListFields(layer, 'startTime')
    filter_fields += ['stop_id', 'stop_name', 'stop_sequence', 'route_short_name', 'trip_headsign']
    filter_table = arcpy.management.DeleteField(layer, filter_fields, method='KEEP_FIELDS')
    return filter_table


def calculate_trip_delay(i, join_layer_name, fields):
    """
    Calculate trip delay based on inding the closest trip
    """
    stop_threshold = 1
    # find the closest trip based on the second stop's schedule (increases up to fourth stop)
    for j, row in enumerate(arcpy.da.SearchCursor(join_layer_name, fields)):
        if j != stop_threshold:
            continue
        if row[1] is None and stop_threshold < 4:
            stop_threshold += 1
            continue
        trips = list(filter(None, row[1:-1]))
        timestamp = row[-1]
        trip_id = get_closest_trip(trips, timestamp)
        break
    arcpy.management.CalculateField(
        join_layer_name, f'delay_{i}', f'!timestamp! - !trip_{trip_id}!')


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

