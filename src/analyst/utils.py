def sanitize_str(string:str) -> str:
    return\
    string\
        .replace(' ', '_')\
        .replace('-', '_')\
        .replace('>', '_')

def get_timestamp(time:str) -> int:
    split = time.split(':')
    split = list(map(int, split))
    res = 0
    res += 86400 if split[0] == 0 else split[0] * 3600
    res += split[1] * 60
    res += split[2]
    return res