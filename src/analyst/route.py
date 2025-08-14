from typing import Iterator
from pandas import DataFrame
from arcpy.conversion import ExportTable
from arcpy.management import Delete
from arcpy import XYTableToPoint_management, ValidateTableName
from os import mkdir, remove


class Route():
    def __init__(self, headsign: str, shapes: Iterator):
        self.headsign: str = headsign
        self.shapes: list[Shape] = [Shape(shape_id)
                                    for shape_id, headsign in shapes]
        self.validated_headsign = ValidateTableName(headsign)

    def load_shapes(self, path: str):
        for shape in self.shapes:
            shape.load_timetable(path)

    def export_shapes(self, path: str):
        try:
            mkdir(f'{path}\\delays_raw')
        except:
            pass
        for shape in self.shapes:
            ExportTable(shape.validated_id,
                        f'{path}\\delays_raw\\{shape.validated_id}.csv')
            try:
                remove(f'{path}\\delays_raw\\{shape.validated_id}.csv.xml')
            except:
                pass


class Shape():
    timetable: DataFrame

    def __init__(self, id: str):
        self.id = id
        self.validated_id = ValidateTableName(id)

    def load_timetable(self, path: str):
        """
        Load GTFS Schedule timetable as ArcGIS feature class. An arcpy workspace should be set before executing this method
        Args:
            path (str): path to the current daily directory
        """
        try:
            mkdir(f'{path}\\timetables')
        except:
            pass
        csv_path = f'{path}\\timetables\\{self.id}.csv'
        self.timetable.to_csv(csv_path)
        ExportTable(csv_path, f'{self.validated_id}_table')
        XYTableToPoint_management(
            f'{self.validated_id}_table', self.validated_id)
        Delete(f'{self.validated_id}_table')
