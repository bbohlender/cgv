export function shallowEqual(array1: Array<any>, array2: Array<any>): boolean {
    if (array1.length != array2.length) {
        return false
    }
    for (let i = 0; i < array1.length; i++) {
        if (array1[i] != array2[i]) {
            return false
        }
    }
    return true
}

export * from "./replace-symbols"
export * from "./trim"
export * from "./equalize"
export * from "./split"
export * from "./hierarchical"
