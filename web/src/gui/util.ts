export function stringToConstant(value: string): string | number | boolean {
    if (value === "true" || value === "false") {
        return value === "true"
    }

    const integer = parseInt(value)
    if (!isNaN(integer)) {
        return integer
    }

    return value
}
