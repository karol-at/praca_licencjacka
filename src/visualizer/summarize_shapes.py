import os
import yaml
import dotenv
import arcpy
from zipfile import ZipFile
from typing import Literal
from functools import reduce
from pandas import read_csv
from statistics import mean

PATH = dotenv.dotenv_values()['DIRECTORY']
assert PATH is not None

RESULT_PATH = dotenv.dotenv_values()['RESULT']
assert RESULT_PATH is not None
WINDOWS_RESULT_PATH = RESULT_PATH.replace('/', '\\')

dirs = os.listdir(PATH)


def generate_shape_summary(city: Literal['warsaw', 'gdansk']):
    shape_maps: list = [yaml.safe_load(
        open(f'{PATH}/{dir}/{city}_shape_map.yml', encoding='utf-8')) for dir in dirs]
    merged_maps = reduce(merge_dictionaries, shape_maps)
    reduced_shapes = {k: list(set(merged_maps[k])) for k in merged_maps}
    with open(f'{RESULT_PATH}/{city}_shape_summary.yml', 'w', encoding='utf-8') as file:
        yaml.dump(reduced_shapes, file, encoding='utf-8')


def merge_dictionaries(dict1: dict, dict2: dict):
    keys = set(dict1).union(dict2)
    no = []
    return {k: dict1.get(k, no) + dict2.get(k, no) for k in keys}


def calculate_shape_lengths(city: Literal['warsaw', 'gdansk']):
    with open(f'{RESULT_PATH}/{city}_shape_summary.yml', encoding='utf-8') as file:
        shapes = yaml.safe_load(file)
    assert isinstance(shapes, dict)

    try:
        arcpy.management.CreateFileGDB(
            WINDOWS_RESULT_PATH, f'{city}_shapes.gdb')
    except:
        pass
    # list every timetable in every daily directory
    timetables = {x: os.listdir(f'{PATH}/{x}/timetables') for x in dirs}

    routes: dict[str, list] = {}

    # replace every shape_id with a list of the shape and the earliest directory which contains it
    for headsign in shapes:
        route_short_name: str = headsign[:3]
        assert isinstance(headsign, str)
        for shape in shapes[headsign]:
            date: str | int = list(
                filter(
                    lambda x: f'{shape[1:]}.csv' in timetables[x], timetables)
            )[0]
            length = get_shape_length(
                f'{PATH}/{date}', city, shape, route_short_name)

            routes[route_short_name] = [
                length] if route_short_name not in routes else routes[route_short_name] + [length]

    routes = {route: mean(routes[route]) for route in routes}
    with open(f'{RESULT_PATH}/{city}_shape_averages.yml', 'w', encoding='utf-8') as file:
        yaml.dump(routes, file, encoding='utf-8')


def get_shape_length(path: str, city: Literal['warsaw', 'gdansk'], shape_id: str, shortname: str):
    """
    Get Length of a given shape
    Args: 
        path (str): path to the current daily working directory
        city (Literal['warsaw', 'gdansk']): the city from which the line comes from
        shape_id (str): arcpy validated id of a shape
        shortname (str): shortname of a route to be used in naming feature classes
    Returns:
        Length of the shape
    """
    windows_path = path.replace("/", "\\")
    arcpy.env.workspace = f'{windows_path}\\base.gdb'
    arcpy.env.overwriteOutput = True
    try:
        os.mkdir(f'{path}/shapes')
    except:
        pass
    with ZipFile(f'{path}/gtfs/{city}.zip') as zip_file:
        with zip_file.open('shapes.txt') as shapes_file:
            shapes = read_csv(shapes_file)
    normalized_shape_id: str | int = shape_id[1:]

    if city == 'warsaw':
        normalized_shape_id = int(normalized_shape_id)

    shapes = shapes[shapes['shape_id'] == normalized_shape_id]

    feature_id = arcpy.ValidateTableName(f'{shape_id}_shape')

    shape_csv_path = f'{windows_path}\\shapes\\{shape_id}.txt'
    shapes.to_csv(shape_csv_path)
    arcpy.conversion.GTFSShapesToFeatures(shape_csv_path, feature_id)
    arcpy.management.CopyFeatures(
        feature_id, f'{WINDOWS_RESULT_PATH}\\{city}_shapes.gdb\\{feature_id}_{shortname}')
    arcpy.management.CalculateGeometryAttributes(
        feature_id, [['LEN', 'LENGTH_GEODESIC']], 'KILOMETERS')
    for row in arcpy.da.SearchCursor(feature_id, ['LEN']):
        return row[0]
