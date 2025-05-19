import datetime


def next_sunday():
    today = datetime.date.today()
    diff = 7 - today.isoweekday()
    if diff == 0:
        return today.isoformat()
    else:
        return (today + datetime.timedelta(diff)).isoformat()


def next_weekday():
    today = datetime.date.today()
    if today.isoweekday() in [1, 2, 3, 4, 5]:
        return today.isoformat()
    else: 
        return (today + datetime.timedelta(2)).isoformat()
