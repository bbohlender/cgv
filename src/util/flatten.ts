import { ParsedSteps } from ".."

export function flatten(parent: ParsedSteps, childIndex: number): boolean {
    if (parent.type != "parallel" && parent.type != "sequential") {
        return false
    }
    const child = parent.children[childIndex]
    if (parent.type != child.type) {
        return false
    }
    parent.children.splice(childIndex, 1, ...child.children)
    return true
}
