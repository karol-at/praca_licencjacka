

def get_timestamp(time:str) -> int:
    split = time.split(':')
    split = list(map(int, split))
    res = 0
    res += split[0] * 3600
    res += split[1] * 60
    res += split[2]
    return res