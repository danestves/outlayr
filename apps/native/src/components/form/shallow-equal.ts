// Values with no own enumerable properties compare equal; the selector outputs compared here are always records.
export function shallowEqual<T>(a: T, b: T): boolean {
    if (Object.is(a, b)) {
        return true;
    }
    if (!(a instanceof Object && b instanceof Object)) {
        return false;
    }
    const left = Object.entries(a);
    const right = new Map(Object.entries(b));
    return (
        left.length === right.size && left.every(([key, value]) => right.has(key) && Object.is(value, right.get(key)))
    );
}
