export function shallowEqual(array1: Array<any> | undefined, array2: Array<any> | undefined): boolean {
    if(array1 == null || array2 == null) {
        return false
    }
    if(array1 == array2) {
        return true
    }
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
