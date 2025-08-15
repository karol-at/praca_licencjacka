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


def get_closest_trip(arr: list[int | float], target: int | float) -> int:
    """
    Returns the index of the value in arr closest to target.
    Assumes arr is sorted in ascending order.
    """
    left, right = 0, len(arr) - 1
    if target <= arr[left]:
        return left
    if target >= arr[right]:
        return right

    while left < right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid

    if left > 0 and abs(arr[left] - target) >= abs(arr[left - 1] - target):
        return left - 1
    return left
