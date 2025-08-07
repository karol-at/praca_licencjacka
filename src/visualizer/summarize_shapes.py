import os
import yaml
from typing import Literal
import dotenv
from functools import reduce

PATH = dotenv.dotenv_values()['DIRECTORY']
assert PATH is not None

RESULT_PATH = dotenv.dotenv_values()['RESULT']
assert RESULT_PATH is not None

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
