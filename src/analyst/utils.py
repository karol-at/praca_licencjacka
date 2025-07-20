def sanitize_str(string:str):
    return\
    string\
        .replace(' ', '_')\
        .replace('-', '_')\
        .replace('>', '_')