import { BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Triangle, Vector3 } from "three"
import { distributeOverSizes, randomIndexBySize } from "./math"

export function getTriangle(
    faceIndex: number,
    positionAttribute: BufferAttribute | InterleavedBufferAttribute,
    target: Triangle
): Triangle {
    target.a.fromBufferAttribute(positionAttribute, faceIndex * 3)
    target.b.fromBufferAttribute(positionAttribute, faceIndex * 3 + 1)
    target.c.fromBufferAttribute(positionAttribute, faceIndex * 3 + 2)
    return target
}

export function sampleTriangle(triangle: Triangle, targetPosition: Vector3): Vector3 {
    let u = Math.random()
    let v = Math.random()

    if (u + v > 1) {
        u = 1 - u
        v = 1 - v
    }

    targetPosition
        .set(0, 0, 0)
        .addScaledVector(triangle.a, u)
        .addScaledVector(triangle.b, v)
        .addScaledVector(triangle.c, 1 - (u + v))

    return targetPosition
}

const _triangle = new Triangle()

export function sampleGeometry(geometry: BufferGeometry, amount: number): Array<Vector3> {
    if (geometry.index != null) {
        geometry = geometry.toNonIndexed()
    }
    const positionAttribute = geometry.getAttribute("position")
    const areas = new Array(positionAttribute.count / 3)
        .fill(null)
        .map((_, i) => getTriangle(i, positionAttribute, _triangle).getArea())
    const amounts = distributeOverSizes(areas, amount)
    const result: Array<Vector3> = []
    for (let index = 0; index < amounts.length; index++) {
        const amountAtIndex = amounts[index]
        if (amountAtIndex == null) {
            continue
        }
        getTriangle(index, positionAttribute, _triangle)
        for (let i = 0; i < amountAtIndex; i++) {
            result.push(sampleTriangle(_triangle, new Vector3()))
        }
    }
    return result
}
