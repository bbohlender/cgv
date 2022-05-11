import { Box3, BufferAttribute, BufferGeometry, Material, Matrix4, Quaternion, Shape, Vector3 } from "three"
import { CSG } from "three-csg-ts"
import { makeTranslationMatrix, ObjectType, Primitive } from "."
import { filterNull } from "../../util"
import { FacePrimitive, GeometryPrimitive, MaterialGenerator } from "./primitive"

const matrixHelper = new Matrix4()

export type Axis = "x" | "y" | "z"
export function getValueOnAxis(vector: Vector3, axis: Axis): number {
    return vector[axis]
}

function setValueOnAxis(vector: Vector3, axis: Axis, value: number): void {
    vector[axis] = value
}

export function getDirection(matrix: Matrix4): "north" | "east" | "west" | "south" | "up" | "down" {
    quaternionHelper.setFromRotationMatrix(matrix)
    vectorHelper.set(0, 1, 0)
    vectorHelper.applyQuaternion(quaternionHelper)
    const x = Math.abs(vectorHelper.x)
    const y = Math.abs(vectorHelper.y)
    const z = Math.abs(vectorHelper.z)
    const max = Math.max(x, y, z)
    if (x === max) {
        return vectorHelper.x < 0 ? "west" : "east"
    }
    if (y === max) {
        return vectorHelper.y < 0 ? "down" : "up"
    }
    return vectorHelper.z < 0 ? "south" : "north"
}

const vectorHelper = new Vector3()

const boundingBox = new Box3()
const primitiveMin = new Vector3()

const box3Helper = new Box3()

export function Split(
    primitive: Primitive,
    axis: Axis,
    generatePrimitive: (matrix: Matrix4, index: number, x: number, y: number, z: number) => Primitive
): Array<Primitive> {
    primitive.getBoundingBox(boundingBox)
    primitiveMin.copy(boundingBox.min)
    let i = 0
    const generatedPrimitives: Array<Primitive> = []
    while (getValueOnAxis(boundingBox.min, axis) < getValueOnAxis(boundingBox.max, axis)) {
        const matrix = primitive.matrix.clone()
        matrix.multiply(makeTranslationMatrix(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z))
        const generatedPrimitive = generatePrimitive(
            matrix,
            i,
            boundingBox.max.x - boundingBox.min.x,
            boundingBox.max.y - boundingBox.min.y,
            boundingBox.max.z - boundingBox.min.z
        )
        generatedPrimitives.push(generatedPrimitive)
        generatedPrimitive.getBoundingBox(box3Helper)
        box3Helper.getSize(vectorHelper)
        i++
        setValueOnAxis(
            boundingBox.min,
            axis,
            getValueOnAxis(boundingBox.min, axis) + getValueOnAxis(vectorHelper, axis)
        )
    }
    return generatedPrimitives
}

export function CSGCombine(
    p1: Primitive,
    p2: Primitive,
    applyCSGOperation: (csg1: CSG, csg2: CSG) => CSG,
    materialGenerator: (type: ObjectType) => Material
): Primitive {
    matrixHelper.copy(p2.matrix).invert().premultiply(p1.matrix)
    const g1 = p1.getGeometry()
    const g2 = p2.getGeometry()?.clone().applyMatrix4(matrixHelper)

    if (g1 == null || g2 == null) {
        throw "can't apply csg invert on primitives with no geometry"
    }

    const csg1 = CSG.fromGeometry(g1)
    const csg2 = CSG.fromGeometry(g2)

    g2?.dispose()

    return new GeometryPrimitive(
        p1.matrix.clone(),
        applyCSGOperation(csg1, csg2).toGeometry(matrixHelper.identity()),
        materialGenerator
    )
}

export function CSGInverse(primitive: Primitive, materialGenerator: (type: ObjectType) => Material): Primitive {
    const g = primitive.getGeometry()
    if (g == null) {
        throw "can't apply csg invert on primitive with no geometry"
    }
    return new GeometryPrimitive(
        primitive.matrix.clone(),
        CSG.fromGeometry(g).inverse().toGeometry(matrixHelper.identity()),
        materialGenerator
    )
}

function addConnectionToGraph(connectionsList: Array<Array<number>>, i1: number, i2: number): void {
    let connections = connectionsList[i1]
    if (connections == null) {
        connections = []
        connectionsList[i1] = connections
    }
    connections.push(i2)
}

export function createGraph(lines: Array<[Vector3, Vector3]>, normal: Vector3, threshold: number): Graph {
    const thresholdSquared = threshold * threshold
    const points: Array<Vector3> = []
    const connectionsList: Array<Array<number>> = []
    for (const [p1, p2] of lines) {
        const i1 = getIndexInPoints(points, p1, thresholdSquared)
        const i2 = getIndexInPoints(points, p2, thresholdSquared)
        addConnectionToGraph(connectionsList, i1, i2)
        addConnectionToGraph(connectionsList, i2, i1)
    }
    for (let i = 0; i < connectionsList.length; i++) {
        const connections = connectionsList[i]
        const sortedAngles = connections
            .slice(1)
            .map((index) => ({
                index,
                angle: degreeBetween(points[i], points[connections[0]], points[index], normal),
            }))
            .sort((e1, e2) => e1.angle - e2.angle)
        connectionsList[i] = [connections[0], ...sortedAngles.map(({ index }) => index)]
    }
    return {
        connectionsList,
        points,
    }
}

function getIndexInPoints(points: Array<Vector3>, point: Vector3, thresholdSquared: number) {
    let index = points.findIndex((p) => vectorHelper.copy(p).sub(point).lengthSq() < thresholdSquared)
    if (index === -1) {
        index = points.length
        points.push(point)
    }
    return index
}

/*export function computeLocalBoundingBox(object: Object3D): Box3 | undefined {
    const box = new Box3()
    if (object instanceof Mesh) {
        (object.geometry as BufferGeometry).computeBoundingBox()
        box.copy((object.geometry as BufferGeometry).boundingBox!)
    }
    for (const child of object.children) {
        const childBoundingBox = computeLocalBoundingBox(child)
        if (childBoundingBox != null) {
            box.union(childBoundingBox)
        }
    }
    box.applyMatrix4(object.matrix)
    return box
}*/

type Graph = {
    points: Array<Vector3>
    connectionsList: Array<Array<number> | undefined>
}

export function expandGraph(
    graph: Graph,
    distance: Array<number> | number,
    offset: Array<number> | number,
    normal: Vector3,
    materialGenerator: MaterialGenerator
): Array<Primitive> {
    if (graph.points.length === 0) {
        return []
    }
    const visited = new Set<string>()
    return graph.connectionsList.reduce<Array<Primitive>>((prev, connections, pointIndex) => {
        if (connections == null) {
            return prev
        }
        return [
            ...prev,
            ...connections
                .map((otherPointIndex, connectionIndex) => {
                    const key1 = `${otherPointIndex}/${pointIndex}`
                    const key2 = `${pointIndex}/${otherPointIndex}`
                    if (visited.has(key1) || visited.has(key2)) {
                        return undefined
                    }
                    visited.add(key1)
                    return generateFaces(
                        graph,
                        pointIndex,
                        connections,
                        connectionIndex,
                        distance,
                        offset,
                        normal,
                        materialGenerator
                    )
                })
                .filter(filterNull),
        ]
    }, [])
}

const globalToLocal = new Matrix4()
const quaternionHelper = new Quaternion()

export const YAXIS = new Vector3(0, 1, 0)
export const ZAXIS = new Vector3(0, 1, 0)

export function generateFaces(
    graph: Graph,
    pointIndex: number,
    connections: Array<number>,
    connectionIndex: number,
    distance: Array<number> | number,
    offset: Array<number> | number,
    normal: Vector3,
    materialGenerator: MaterialGenerator
): Primitive {
    const otherPointIndex = connections[connectionIndex]
    const shape = new Shape()
    const matrix = new Matrix4()
    const currentPoint = graph.points[pointIndex]
    const nextPoint = graph.points[otherPointIndex]
    vectorHelper.copy(nextPoint).sub(currentPoint).setY(0).normalize()
    matrix.makeBasis(vectorHelper, YAXIS, new Vector3().crossVectors(vectorHelper, YAXIS))
    //quaternionHelper.setFromUnitVectors(ZAXIS, vectorHelper)
    matrix.premultiply(makeTranslationMatrix(currentPoint.x, currentPoint.y, currentPoint.z))

    globalToLocal.copy(matrix).invert()
    drawTriangle(
        graph,
        shape,
        globalToLocal,
        Array.isArray(distance) ? distance[pointIndex] : distance,
        currentPoint,
        nextPoint,
        normal,
        connectionIndex,
        connections,
        true
    )
    const otherConnections = graph.connectionsList[otherPointIndex]
    const indexOfConnectionToPoint = otherConnections?.indexOf(pointIndex)
    drawTriangle(
        graph,
        shape,
        globalToLocal,
        Array.isArray(distance) ? distance[otherPointIndex] : distance,
        nextPoint,
        currentPoint,
        normal,
        indexOfConnectionToPoint,
        otherConnections,
        false
    )
    return new FacePrimitive(matrix, shape, materialGenerator)
}

const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()

const otherOriginToOriginNormal = new Vector3()
const originToSuccessorConnectionNormal = new Vector3()
const originToPredecessorConnectionNormal = new Vector3()

function drawTriangle(
    graph: Graph,
    shape: Shape,
    globalToLocal: Matrix4,
    distance: number,
    origin: Vector3,
    otherOrigin: Vector3,
    normal: Vector3,
    i: number | undefined,
    connections: Array<number> | undefined,
    initial: boolean
) {
    v2.copy(origin).applyMatrix4(globalToLocal)
    if (i != null && connections != null && connections.length > 1) {
        otherOriginToOriginNormal.copy(otherOrigin).sub(origin).normalize()

        originToSuccessorConnectionNormal
            .copy(graph.points[connections[(i + connections.length - 1) % connections.length]])
            .sub(origin)
            .normalize()

        v1.copy(otherOriginToOriginNormal).add(originToSuccessorConnectionNormal).normalize().multiplyScalar(distance)

        if (connections.length === 2) {
            originToPredecessorConnectionNormal.copy(originToSuccessorConnectionNormal)
            v3.copy(v1)
        } else {
            originToPredecessorConnectionNormal
                .copy(graph.points[connections[(i + 1) % connections.length]])
                .sub(origin)
                .normalize()

            v3.copy(otherOriginToOriginNormal)
                .add(originToPredecessorConnectionNormal)
                .normalize()
                .multiplyScalar(distance)
        }

        vectorHelper.crossVectors(otherOriginToOriginNormal, normal)

        const successorClockwise = vectorHelper.dot(originToSuccessorConnectionNormal) >= 0
        if (!successorClockwise) {
            v1.multiplyScalar(-1)
        }

        const predecessorClockwise = vectorHelper.dot(originToPredecessorConnectionNormal) >= 0
        if (predecessorClockwise) {
            v3.multiplyScalar(-1)
        }
    } else {
        v1.copy(otherOrigin).sub(origin).cross(normal).normalize().multiplyScalar(distance)
        v3.copy(v1).multiplyScalar(-1)
    }

    v1.add(origin).applyMatrix4(globalToLocal)
    v3.add(origin).applyMatrix4(globalToLocal)

    if (initial) {
        shape.moveTo(v1.x, v1.z)
    } else {
        shape.lineTo(v1.x, v1.z)
    }
    shape.lineTo(v2.x, v2.z)
    shape.lineTo(v3.x, v3.z)
}

function degreeBetween(targetPoint: Vector3, p1: Vector3, p2: Vector3, normal: Vector3): number {
    v1.copy(p1).sub(targetPoint)
    v2.copy(p2).sub(targetPoint)
    const cw = v3.crossVectors(v1, normal).dot(v2) < 0
    v1.projectOnPlane(normal)
    v2.projectOnPlane(normal)
    const angle = v1.angleTo(v2)
    return cw ? angle : Math.PI * 2 - angle
}

function expandLine(
    distance: number,
    offset: number,
    position1: Vector3,
    normal1: Vector3,
    position2: Vector3,
    normal2: Vector3
): BufferGeometry {
    const geometry = new BufferGeometry()
    const vertecies = new Float32Array()
    vectorHelper.copy(normal1).multiplyScalar(offset).add(position1).toArray(vertecies, 0)
    vectorHelper.copy(normal2).multiplyScalar(offset).add(position2).toArray(vertecies, 3)
    vectorHelper
        .copy(normal2)
        .multiplyScalar(offset + distance)
        .add(position2)
        .toArray(vertecies, 9)
    vectorHelper
        .copy(normal1)
        .multiplyScalar(offset + distance)
        .add(position1)
        .toArray(vertecies, 6)
    geometry.setAttribute("position", new BufferAttribute(vertecies, 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    return geometry
}
