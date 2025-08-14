import dotenv
import os
import pathlib
import pandas
import yaml
import numpy
import scipy.stats

PATH = dotenv.dotenv_values()['DIRECTORY']
assert PATH is not None
RESULT_PATH = dotenv.dotenv_values()['RESULT']
assert RESULT_PATH is not None

total_duplicate_lines: dict[str, int] = {}

shapeMap = dict[
    str,
    list[
        dict[
            str,
            dict[
                str,
                int
            ]
        ]
    ]
]

dirs = os.listdir(PATH)
dirs: list[str] = list(
    filter(lambda x: pathlib.Path(f'{PATH}/{x}').is_dir(), dirs))


def calculate_accuracy():

    delay_series_list: list[pandas.Series] = []
    delay_series_list_nofirstlast: list[pandas.Series] = []
    delay_mismatch = 0

    accuracy_summary: dict[str, dict[str, int]] = {
    }

    for dir in dirs:
        with open(f'{PATH}/{dir}/gdansk_shape_map.yml', encoding='utf-8') as file:
            gdansk_shape_map: shapeMap | None = yaml.safe_load(file)
        assert isinstance(gdansk_shape_map, dict)
        shapes = []
        for k in gdansk_shape_map:
            shapes += gdansk_shape_map[k]
            line_id = k[:3]
            if line_id not in accuracy_summary:
                accuracy_summary[line_id] = {
                    'shape_mismatch': 0,
                    'repeated_travel': 0,
                    'descending': 0
                }
            for shape in gdansk_shape_map[k]:
                for shape_id in shape:
                    for stat in shape[shape_id]:
                        accuracy_summary[line_id][stat] += shape[shape_id][stat]

        for shape in shapes:
            if isinstance(shape, dict):
                shape = list(shape.keys())[0]
            df: pandas.DataFrame = pandas.read_csv(
                f'{PATH}/{dir}/delays/{shape}.csv', delimiter=';', decimal=',')
            columns = df.filter(regex=r'delay_\d')
            ZTM_columns = df.filter(regex=r'delay_ZTM')
            for column in zip(columns, ZTM_columns):

                ztm_column = ZTM_columns[column[1]]
                delay_column = columns[column[0]]

                if abs((ztm_column[1:-1] - delay_column[1:-1]).max()) > 900: # type: ignore
                    delay_mismatch += 1
                    continue
                assert abs(
                    (ztm_column[1:-1] - delay_column[1:-1]).max()) < 2000 # type: ignore

                delay_series_list += [ztm_column - delay_column]
                # type: ignore
                delay_series_list_nofirstlast += [
                    ztm_column[1:-1] - delay_column[1:-1]] #type: ignore
        with open(f'{PATH}/{dir}/warsaw_shape_map.yml', encoding='utf-8') as file:
            warsaw_shape_map: shapeMap | None = yaml.safe_load(file)
        assert isinstance(warsaw_shape_map, dict)

        for line in warsaw_shape_map:
            line_id = line[:3]
            if line_id not in accuracy_summary:
                accuracy_summary[line_id] = {
                    'shape_mismatch': 0,
                    'repeated_travel': 0,
                    'descending': 0
                }
            for shape in warsaw_shape_map[line]:
                for shape_id in shape:
                    for stat in shape[shape_id]:
                        accuracy_summary[line_id][stat] += shape[shape_id][stat]

    delay_series = pandas.concat(delay_series_list)
    delay_series_nofirstlast = pandas.concat(delay_series_list_nofirstlast)
    delay_series.to_csv(f'{RESULT_PATH}/accuracy.csv')
    delay_series_nofirstlast.to_csv(f'{RESULT_PATH}/accuracy_nofirstlast.csv')
    with open(f'{RESULT_PATH}/accuracy.yml', 'w', encoding='utf-8') as file:
        yaml.dump(calculate_accuracy_statistics(
            delay_series, delay_mismatch), file, allow_unicode=True)
    with open(f'{RESULT_PATH}/accuracy_nofirstlast.yml', 'w', encoding='utf-8') as file:
        yaml.dump(calculate_accuracy_statistics(
            delay_series_nofirstlast, delay_mismatch), file, allow_unicode=True)
    with open(f'{RESULT_PATH}/cleanup_results.yml', 'w', encoding='utf-8') as file:
        yaml.dump(accuracy_summary, file, allow_unicode=True)


def calculate_accuracy_statistics(delays: pandas.Series, mismatch_count: int):
    delays_no_na = delays.dropna()
    return {
        'standard_deviation': float(numpy.std(delays_no_na)), # type: ignore
        'average': float(numpy.average(delays_no_na)),
        'skewness': float(scipy.stats.skew(delays_no_na)),
        'nan_count': int(delays.size - delays.count()),
        'element_count': int(delays.count()),
        'highest': int(delays.max()),
        'lowest': int(delays.min()),
        'mismatch_count': mismatch_count
    }


calculate_accuracy()
