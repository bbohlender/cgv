import { Box3, BufferGeometry, Material, Matrix4, Mesh, Object3D, Vector3 } from "three"
import { CSG } from "three-csg-ts"
import { makeTranslationMatrix, ObjectPrimitive, ObjectType, PointPrimitive, Primitive } from "."
import { GeometryPrimitive } from "./primitive"

const vectorHelper = new Vector3()
const moveVector = new Vector3()
const matrixHelper = new Matrix4()

export type Axis = "x" | "y" | "z"
export function getValueOnAxis(vector: Vector3, axis: Axis): number {
    return vector[axis]
}

function setValueOnAxis(vector: Vector3, axis: Axis, value: number): void {
    vector[axis] = value
}

const restSize = new Vector3()

export function Split(
    primitive: Primitive,
    axis: Axis,
    generatePrimitive: (matrix: Matrix4, index: number, x: number, y: number, z: number) => Primitive
): Array<Primitive> {
    primitive.getGeometrySize(restSize)
    let i = 0
    const generatedPrimitives: Array<Primitive> = []
    moveVector.set(0, 0, 0)
    while (getValueOnAxis(restSize, axis) > 0) {
        const matrix = primitive.matrix.clone()
        matrix.multiply(makeTranslationMatrix(moveVector.x, moveVector.y, moveVector.z))
        const generatedPrimitive = generatePrimitive(matrix, i, restSize.x, restSize.y, restSize.z)
        generatedPrimitive.getGeometrySize(vectorHelper)
        generatedPrimitives.push(generatedPrimitive)
        i++
        const primtiveSizeOnAxis = getValueOnAxis(vectorHelper, axis)
        setValueOnAxis(restSize, axis, getValueOnAxis(restSize, axis) - primtiveSizeOnAxis)
        setValueOnAxis(moveVector, axis, getValueOnAxis(moveVector, axis) + primtiveSizeOnAxis)
    }
    return generatedPrimitives
}

export function CenterPoint(primtive: Primitive, materialGenerator: (type: ObjectType) => Material): Primitive {
    const result = new PointPrimitive(primtive.matrix, materialGenerator)
    primtive.getGeometrySize(vectorHelper)
    vectorHelper.divideScalar(2)
    result.multiplyMatrix(makeTranslationMatrix(vectorHelper.x, vectorHelper.y, vectorHelper.z))
    return result
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

export function createGraph(lines: Array<[Vector3, Vector3]>, threshold: number) {
    const thresholdSquared = threshold * threshold
    const points: Array<Vector3> = []
    const connectionsList: Array<Array<number>> = []
    for (const [p1, p2] of lines) {
        const i1 = getIndexInPoints(points, p1, threshold)
        const i2 = getIndexInPoints(points, p2, threshold)
        let connections = connectionsList[i1]
        if (connections == null) {
            connections = []
            connectionsList[i1] = connections
        }
        connections.push(i2)
    }
}

function getIndexInPoints(points: Array<Vector3>, point: Vector3, thresholdSquared: number) {
    let index = points.findIndex((p) => vectorHelper.copy(p).sub(point).lengthSq() < thresholdSquared)
    if (index !== -1) {
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
    connectionsList: Array<Array<number>>
}

/*
export function expandGraph(
    graph: Graph,
    distance: Array<number> | number,
    normal: Vector3,
    options: {
        inside: "expand" | "nothing" | "fill"
        outside: "expand" | "nothing"
    }
): Shape {
    const finishedPoints = new Set<number>()
    for(let i = 0; i < graph.points.length; i++) {
        const target = graph.points[i]
        const first = graph.points[graph.connectionsList[i][0]]
        const sortedConnections = graph.connectionsList[i].map(index => {
            const point = graph.points[index]
            return { index, degree: degreeBetween(target, first, point, normal) }
        }).sort((a, b) => a.degree - b.degree)
        for(const { degree, index } of sortedConnections) {
            if(finishedPoints.has(index)) {
                continue
            }
            const degreeToPrevious = ;
            const degreeToNext = ;
            const towardPoint = graph.points[index]
            //TODO: hexagon between target and towardPoint
        }
        finishedPoints.add(i)
    }
}

const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()

function degreeBetween(targetPoint: Vector3, p1: Vector3, p2: Vector3, normal: Vector3) {
    v1.copy(p1).sub(targetPoint)
    v2.copy(p2).sub(targetPoint)
    const cw = v3.copy(v1).cross(normal).dot(v2) >= 0
    v1.projectOnPlane(normal)
    v2.projectOnPlane(normal)
    const angle = v1.angleTo(v2)
    return cw ? angle : Math.PI * 2 - angle
}*/
