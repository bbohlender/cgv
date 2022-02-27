export function filterNull<T>(val: T | undefined | null): val is T {
    return val != null
}

export * from "./replace-symbols"
export * from "./trim"
