import { from, map, Observable, of, shareReplay } from "rxjs"
import { LinePrimitive, loadMap, PointPrimitive } from "."
import { Operations, simpleExecution } from "../.."
import { makeRotationMatrix, makeScaleMatrix, makeTranslationMatrix } from "./math"
import { createPhongMaterialGenerator, FacePrimitive, Primitive } from "./primitive"
import { Axis, Split } from "./primitive-utils"
import { Color, Matrix4, Shape, Vector2, Vector3 } from "three"
import { defaultOperations } from ".."

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

function computeMapbox(/*[lat, lon]: ReadonlyArray<any>*/): Observable<Array<Primitive>> {
    return from(loadMap()).pipe(
        map(([roads, buildings]) => {
            //TODO: forward parameters
            const values = [...roads, ...buildings].map<Primitive>(([primitive, parameters], i) => primitive)
            return values
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    )
}

function computePoint(x: number, y: number, z: number): Observable<Array<Primitive>> {
    return of([new PointPrimitive(makeTranslationMatrix(x, y, z, new Matrix4()), redMaterialGenerator)])
}

const helperVector = new Vector3()

//TODO: make capable of 3d (currently only 2d)
function computeFace(...points: ReadonlyArray<Primitive>): Observable<Array<Primitive>> {
    const points2d = points.map((point) => {
        helperVector.setFromMatrixPosition(point.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })

    return of([new FacePrimitive(new Matrix4(), new Shape(points2d), redMaterialGenerator)])
}

//TODO: make capable of 3d (currently only 2d)
function computeLine(...points: ReadonlyArray<Primitive>): Observable<Array<Primitive>> {
    if (points.length < 2) {
        return of([])
    }
    const [p1, p2] = points.map((point) => {
        helperVector.setFromMatrixPosition(point.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    return of([LinePrimitive.fromPoints(new Matrix4(), p1, p2, redMaterialGenerator)])
}

const size = new Vector3()

function computeSize(instance: Primitive, axis: "x" | "y" | "z"): Observable<Array<any>> {
    instance.getGeometrySize(size)
    return of([size[axis as keyof Vector3]])
}

function computeScale(instance: Primitive, x: number, y: number, z: number): Observable<Array<Primitive>> {
    return of([instance.multiplyMatrix(makeScaleMatrix(x, y, z))])
}

function degreeToRadians(degree: number): number {
    return (Math.PI * degree) / 180
}

function computeRotate(instance: Primitive, x: number, y: number, z: number): Observable<Array<Primitive>> {
    return of([instance.multiplyMatrix(makeRotationMatrix(degreeToRadians(x), degreeToRadians(y), degreeToRadians(z)))])
}

function computeTranslate(instance: Primitive, x: number, y: number, z: number): Observable<Array<Primitive>> {
    return of([instance.multiplyMatrix(makeTranslationMatrix(x, y, z))])
}

function computeColorChange(instance: Primitive, color: Color): Observable<Array<Primitive>> {
    return of([instance.changeMaterialGenerator(createPhongMaterialGenerator(color))])
}

function computeExtrude(instance: Primitive, by: number): Observable<Array<Primitive>> {
    return of([instance.extrude(by)])
}

function computeComponents(
    type: "points" | "lines" | "faces",
    ...instances: Array<Primitive>
): Observable<Array<Primitive>> {
    const components = instances.reduce<Array<Primitive>>(
        (instances, instance) => [...instances, ...instance.components(type)],
        []
    )
    return of(components)
}

function computeSplit(axis: Axis, instance: Primitive, at: number, limit?: number): Observable<Array<Primitive>> {
    const splits = Split(instance, axis, (matrix, index, x, y, z) => {
        if (limit == null || index < limit) {
            const sizeX = axis === Axis.X ? Math.min(at, x) : x
            const sizeZ = axis === Axis.Z ? Math.min(at, z) : z
            return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, false, instance.materialGenerator)
        } else {
            return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.materialGenerator)
        }
    })
    return of(splits)
}

function computeMultiSplit(axis: Axis, instance: Primitive, ...distances: Array<number>): Observable<Array<Primitive>> {
    const splits = Split(instance, axis, (matrix, index, x, y, z) => {
        const sizeX = axis === Axis.X && distances[index] != null ? Math.min(distances[index], x) : x
        const sizeZ = axis === Axis.Z && distances[index] != null ? Math.min(distances[index], z) : z

        return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, false, instance.materialGenerator)
    })
    return of(splits)
}

export const operations: Operations<any, any> = {
    ...defaultOperations,
    translate: {
        execute: simpleExecution<any, unknown>(computeTranslate),
        includeThis: true,
        defaultParameters: [
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
        ],
    },
    scale: {
        execute: simpleExecution<any, unknown>(computeScale),
        includeThis: true,
        defaultParameters: [
            () => ({ type: "raw", value: 1 }),
            () => ({ type: "raw", value: 1 }),
            () => ({ type: "raw", value: 1 }),
        ],
    },
    rotate: {
        execute: simpleExecution<any, unknown>(computeRotate),
        includeThis: true,
        defaultParameters: [
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
        ],
    },
    extrude: {
        execute: simpleExecution<any, unknown>(computeExtrude),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 100 })],
    },
    splitX: {
        execute: simpleExecution<any, unknown>(computeSplit.bind(null, Axis.X)),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 10 })],
    },
    splitZ: {
        execute: simpleExecution<any, unknown>(computeSplit.bind(null, Axis.Z)),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 10 })],
    },
    multiSplitX: {
        execute: simpleExecution<any, unknown>(computeMultiSplit.bind(null, Axis.X)),
        includeThis: true,
        defaultParameters: [],
    },
    multiSplitZ: {
        execute: simpleExecution<any, unknown>(computeMultiSplit.bind(null, Axis.Z)),
        includeThis: true,
        defaultParameters: [],
    },
    toPoints: {
        execute: simpleExecution<any, unknown>(computeComponents.bind(null, "points")),
        includeThis: true,
        defaultParameters: [],
    },
    toLines: {
        execute: simpleExecution<any, unknown>(computeComponents.bind(null, "lines")),
        includeThis: true,
        defaultParameters: [],
    },
    toFaces: {
        execute: simpleExecution<any, unknown>(computeComponents.bind(null, "faces")),
        includeThis: true,
        defaultParameters: [],
    },
    color: {
        execute: simpleExecution<any, unknown>(computeColorChange),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 0xff0000 })],
    },
    size: {
        execute: simpleExecution<any, unknown>(computeSize),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: "x" })],
    },
    mapbox: {
        execute: simpleExecution<any, unknown>(computeMapbox),
        includeThis: false,
        defaultParameters: [],
    },
    point: {
        execute: simpleExecution<any, unknown>(computePoint),
        includeThis: false,
        defaultParameters: [
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
        ],
    },
    line: {
        execute: simpleExecution<any, unknown>(computeLine),
        includeThis: false,
        defaultParameters: [],
    },
    face: {
        execute: simpleExecution<any, unknown>(computeFace),
        includeThis: false,
        defaultParameters: [],
    },
}
