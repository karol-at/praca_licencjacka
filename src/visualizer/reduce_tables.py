import pandas
import numpy
import os
import dotenv
import pathlib
import yaml
import arcpy
from functools import reduce
from datetime import date
from pathvalidate import sanitize_filepath


PATH = dotenv.dotenv_values()['DIRECTORY']
assert PATH is not None
RESULT_PATH = dotenv.dotenv_values()['RESULT']
assert RESULT_PATH is not None


dirs = os.listdir(PATH)
dirs: list[str] = list(
    filter(lambda x: pathlib.Path(f'{PATH}/{x}').is_dir(), dirs))


def calculate_delay_averages(weekend: bool | None = None):
    if weekend:
        dates: list[str] = [d for d in dirs if date(
            int(d[0:4]), int(d[5:7]), int(d[8:10])).weekday() > 4
            or d in ['2025-06-19', '2025-06-20']]
    elif weekend == False:
        dates: list[str] = [d for d in dirs if date(
            int(d[0:4]), int(d[5:7]), int(d[8:10])).weekday() < 5
            and d not in ['2025-06-19', '2025-06-20']]
    else:
        dates = dirs
    averages_list: list[dict[str, pandas.DataFrame]] = [
        sum_directory_tables(d) for d in dates]
    averages_dict: dict[str, list[pandas.DataFrame]] = {}

    for d in averages_list:
        for k in d:
            averages_dict[k] = [
                d[k]] if k not in averages_dict else averages_dict[k] + [d[k]]

    averages: dict[str, pandas.DataFrame] = {
        k: reduce(lambda x, y: (0, x[1].merge(y[1][['stop_id', 'average']], on='stop_id',
                  how='outer', suffixes=("", f"_{y[0]}"))), enumerate(averages_dict[k]))[1]
        for k in averages_dict
    }

    # TODO: zrobić jeszcze pod weekendy

    suffix_dict = {
        True: '_weekend',
        False: '_weekday',
        None: ''
    }

    save_directory = sanitize_filepath(
        f'{RESULT_PATH}/avg_delays{suffix_dict[weekend]}', platform='windows')

    try:
        os.mkdir(save_directory)
    except:
        pass
    try:
        arcpy.management.CreateFileGDB(
            save_directory, 'delays.gdb')
    except:
        pass
    arcpy.env.workspace = f'{save_directory}\\delays.gdb'
    arcpy.env.overwriteOutput = True
    for k in averages:
        columns: list[str] = [c for c in averages[k].columns if 'average' in c]
        index = averages[k][['stop_id', 'stop_lat',
                             'stop_lon', 'stop_name']].copy()
        assert isinstance(index, pandas.DataFrame)
        index['avg'] = averages[k][columns].apply(numpy.average, axis=1)
        index[['stop_lat', 'stop_lon']] = index[['stop_lat', 'stop_lon']].map(
            lambda x: x.replace(',', '.') if isinstance(x, str) else x)

        csv_path = sanitize_filepath(
            f'{save_directory}/{k}.csv', platform='windows')
        index.to_csv(csv_path)
        layer_name = arcpy.ValidateTableName(k)
        table_name = layer_name + '_table'
        arcpy.conversion.ExportTable(csv_path, table_name)
        arcpy.management.XYTableToPoint(
            table_name, layer_name, 'stop_lon', 'stop_lat')
        arcpy.management.Delete(table_name)


def sum_directory_tables(date: str, filter: Callable[[str], int]) -> dict[str, pandas.DataFrame]:
    with open(f'{PATH}/{date}/warsaw_shape_map.yml', encoding='utf-8') as file:
        warsaw_shapes = yaml.safe_load(file)
    with open(f'{PATH}/{date}/gdansk_shape_map.yml', encoding='utf-8') as file:
        gdansk_shapes = yaml.safe_load(file)

    assert isinstance(warsaw_shapes, dict)
    assert isinstance(gdansk_shapes, dict)

    lines: dict[str, list] = {}
    lines_dataframes: dict[str, pandas.DataFrame] = {}

    for line in gdansk_shapes:
        lines[line] = gdansk_shapes[line]
    for line in warsaw_shapes:
        lines[line] = warsaw_shapes[line]

    for line in lines:
        dataframes: list[pandas.DataFrame] = [pandas.read_csv(
            f'{PATH}/{date}/delays/{shape_id}.csv', delimiter=';', decimal=',') for shape in lines[line] for shape_id in shape]
        for i, df in enumerate(dataframes):
            columns: list[str] = ['stop_id',
                                  'stop_lat', 'stop_lon', 'stop_name']
            columns += [
                c for c in df.columns if 'delay_' in c and 'delay_ZTM' not in c and filter(c)]
            if len(dataframes) == 1:
                columns += ['stop_sequence']
            selection = df[columns]
            assert isinstance(selection, pandas.DataFrame)
            replacement_columns = {c: f'{c}_{i}' for c in columns}
            dataframes[i] = selection

        df: pandas.DataFrame = reduce(lambda x, y: x.merge(
            y, on=['stop_id', 'stop_lat', 'stop_lon', 'stop_name'], how='outer'), dataframes)
        delays = df.filter(regex=r'delay_\d')
        not_na_count: pandas.Series = delays.count(
            axis=1)  # type: ignore
        if len(delays.columns) == 0:
            continue
        delays.fillna(0, inplace=True)

        avg = delays.apply(numpy.average, axis=1)
        index = df[['stop_id', 'stop_lat', 'stop_lon', 'stop_name'] +
                   (['stop_sequence'] if 'stop_sequence' in df.columns else [])]
        assert isinstance(avg, pandas.Series)\
            and isinstance(index, pandas.DataFrame)
        df = index
        df['average'] = avg
        df['not_na_count'] = not_na_count
        lines_dataframes[line] = df
    return lines_dataframes
