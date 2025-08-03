from itertools import Iterator
from pandas import DataFrame
from arcpy.conversion import ExportTable
from arcpy import XYTableToPoint_management, ValidateTableName


class Route():
    def __init__(self, headsign: str, shapes: Iterator):
        self.headsign: str = headsign
        self.shapes: list[Shape] = [Shape(x) for x in shapes]
        self.validated_headsign = ValidateTableName(headsign)

    def load_shapes(self, path: str):
        for shape in self.shapes:
            shape.load_timetable(path)

    def export_shapes(self):
        for shape in self.shapes:
            ExportTable(shape.id)


class Shape():
    timetable: DataFrame

    def __init__(self, id: str):
        self.id = id

    def load_timetable(self, path: str):
        """
        Load GTFS Schedule timetable as ArcGIS feature class. An arcpy workspace should be set before executing this method
        Args:
            path (str): path to the current daily directory
        """
        csv_path = f'{path}/timetables/{self.id}.csv'
        self.timetable.to_csv(csv_path)
        ExportTable(csv_path, f'{self.id}_table')
        XYTableToPoint_management(f'{self.id}_table', self.id)
