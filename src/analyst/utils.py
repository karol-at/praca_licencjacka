def sanitize_str(string:str) -> str:
    return\
    string\
        .replace(' ', '_')\
        .replace('-', '_')\
        .replace('>', '_')

def get_timestamp(time:str) -> int:
    split = time.split(':')
    res = 0
    res += split[0] * 3600
    res += split[1] * 60
    res += split[2]
    return res