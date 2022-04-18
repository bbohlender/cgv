import { Box3, Euler, Matrix4, Vector3 } from "three"

const box3Helper = new Box3()
const centerHelper = new Vector3()
const sizeHelper = new Vector3()
const matrixHelper = new Matrix4()
const vectorHelper = new Vector3()
const eulerHelper = new Euler()

/*export function distanceToInstance(from: Vector3, to: Instance): number {
  let size =
    to.type === "2D" ? sizeHelper.set(to.size.x, 0, to.size.y) : to.size;
  centerHelper.copy(size);
  centerHelper.divideScalar(2);
  box3Helper.setFromCenterAndSize(centerHelper, size);
  matrixHelper.copy(to.matrix).invert();
  vectorHelper.copy(from);
  vectorHelper.applyMatrix4(matrixHelper);
  return box3Helper.distanceToPoint(vectorHelper);
}*/

export function computeDirectionMatrix(
    normalizedXAxis: Vector3,
    normalizedYAxis: Vector3,
    matrix = matrixHelper
): Matrix4 {
    vectorHelper.crossVectors(normalizedXAxis, normalizedYAxis)
    return matrix.makeBasis(normalizedXAxis, normalizedYAxis, vectorHelper)
}

export function makeTranslationMatrix(x: number, y: number, z: number, matrix = matrixHelper): Matrix4 {
    return matrix.makeTranslation(x, y, z)
}

export function makeRotationMatrix(x: number, y: number, z: number, matrix = matrixHelper): Matrix4 {
    return matrix.makeRotationFromEuler(eulerHelper.set(x, y, z))
}

export function makeScaleMatrix(x: number, y: number, z: number, matrix = matrixHelper): Matrix4 {
    return matrix.makeScale(x, y, z)
}

export function randomIndexBySize(sizes: Array<number>, sum: number): number {
    let acc = 0
    const random = Math.random() * sum
    for (let i = 0; i < sizes.length; i++) {
        acc += sizes[i]
        if (random <= acc) {
            return i
        }
    }
    return sizes.length - 1
}

export function distributeOverSizes(sizes: Array<number>, amount: number): Array<number | undefined> {
    const sumSize = sizes.reduce((prev, size) => prev + size, 0)
    const amounts: Array<number | undefined> = []
    for (let i = 0; i < amount; i++) {
        const index = randomIndexBySize(sizes, sumSize)
        amounts[index] = (amounts[index] ?? 0) + 1
    }
    return amounts
}
