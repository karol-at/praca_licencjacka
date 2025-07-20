import arcpy
import stop_preparator as sp
import env
import os
import config
from typing import Literal

dates = os.listdir(env.path)
for date in dates:
    for city in config.cities:
        df = sp.get_stops(f'{env.path}/{date}/gtfs/{city}.zip', city)
        lines = sp.split_lines(df)
        gdb = arcpy.management.CreateFileGDB(f'{env.path}\\{date}', 'base.gdb')
        processed_lines = {}
        for line in lines:
            processed_lines[line] = sp.stops_to_features(gdb, city, lines[line])
            
