import arcpy
import stop_preparator as sp
import connector as con
import env
import pathlib
import config
import yaml
from clean_tables import clean_tables

errors = []
dates = env.initial_dir.split(',')
print(dates)

for date in dates:

    cwd = f'{env.path}\\{date}'

    if not pathlib.Path(f'{cwd}\\base.gdb').exists():
        arcpy.management.CreateFileGDB(cwd, 'base.gdb')

    arcpy.env.workspace = f'{cwd}\\base.gdb'

    for city in config.cities:

        if city not in ['warsaw', 'gdansk']:
            raise ValueError()

        df = sp.load_gtfs(f'{env.path}\\{date}\\gtfs\\{city}.zip', city)
        lines = sp.split_shapes(df)

        print('GTFS data processed for', city, date)

        for line in lines:
            lines[line].load_shapes(cwd)
            con.join_line(cwd, lines[line])
            lines[line].export_shapes(cwd)
            with open(f'{cwd}\\{arcpy.ValidateTableName(line)}_errors.txt', 'w') as file:
                file.write(str(env.errors))
                env.errors = []
            print(f'processed line {line}')

        shape_map = {line: [shape.validated_id for shape in lines[line].shapes]
                     for line in lines}
        yml = clean_tables(cwd, shape_map, city)

        with open(f'{cwd}\\{city}_shape_map.yml', 'w', encoding='utf-8') as file:
            yaml.dump(yml, file, allow_unicode=True)
