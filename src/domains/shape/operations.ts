import { from, map, Observable, of, shareReplay } from "rxjs"
import { Instance, LinePrimitive, loadMap, PointPrimitive } from "."
import { Operations, simpleExecution } from "../.."
import { makeRotationMatrix, makeScaleMatrix, makeTranslationMatrix } from "./math"
import { createPhongMaterialGenerator, FacePrimitive } from "./primitive"
import { Axis, Split } from "./primitive-utils"
import { Color, Matrix4, Shape, Vector2, Vector3 } from "three"
import { defaultOperations } from ".."

const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

function computeMapbox(/*[lat, lon]: ReadonlyArray<any>*/): Observable<Array<Instance>> {
    return from(loadMap()).pipe(
        map(([roads, buildings]) => {
            //TODO: forward parameters
            const values = [...roads, ...buildings].map<Instance>(([primitive, parameters], i) => ({
                attributes: {},
                primitive,
            }))
            return values
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    )
}

function computePoint(x: number, y: number, z: number): Observable<Array<Instance>> {
    return of([
        {
            attributes: {},
            primitive: new PointPrimitive(makeTranslationMatrix(x, y, z, new Matrix4()), redMaterialGenerator),
        },
    ])
}

const helperVector = new Vector3()

//TODO: make capable of 3d (currently only 2d)
function computeFace(...points: ReadonlyArray<Instance>): Observable<Array<Instance>> {
    const points2d = points.map((point) => {
        helperVector.setFromMatrixPosition(point.primitive.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    return of([
        {
            attributes: {},
            primitive: new FacePrimitive(new Matrix4(), new Shape(points2d), redMaterialGenerator),
        },
    ])
}

//TODO: make capable of 3d (currently only 2d)
function computeLine(...points: ReadonlyArray<Instance>): Observable<Array<Instance>> {
    const [p1, p2] = points.map((point) => {
        helperVector.setFromMatrixPosition(point.primitive.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    return of([
        {
            attributes: {},
            primitive: LinePrimitive.fromPoints(new Matrix4(), p1, p2, redMaterialGenerator),
        },
    ])
}

const size = new Vector3()

function computeSize(instance: Instance, axis: "x" | "y" | "z"): Observable<Array<any>> {
    instance.primitive.getGeometrySize(size)
    return of([size[axis as keyof Vector3]])
}

function computeScale(instance: Instance, x: number, y: number, z: number): Observable<Array<Instance>> {
    return of([
        {
            attributes: { ...instance.attributes },
            primitive: instance.primitive.multiplyMatrix(makeScaleMatrix(x, y, z)),
        },
    ])
}

function degreeToRadians(degree: number): number {
    return (Math.PI * degree) / 180
}

function computeRotate(instance: Instance, x: number, y: number, z: number): Observable<Array<Instance>> {
    return of([
        {
            attributes: { ...instance.attributes },
            primitive: instance.primitive.multiplyMatrix(
                makeRotationMatrix(degreeToRadians(x), degreeToRadians(y), degreeToRadians(z))
            ),
        },
    ])
}

function computeTranslate(instance: Instance, x: number, y: number, z: number): Observable<Array<Instance>> {
    return of([
        {
            attributes: { ...instance.attributes },
            primitive: instance.primitive.multiplyMatrix(makeTranslationMatrix(x, y, z)),
        },
    ])
}

function computeColorChange(instance: Instance, color: Color): Observable<Array<Instance>> {
    return of([
        {
            attributes: { ...instance.attributes },
            primitive: instance.primitive.changeMaterialGenerator(createPhongMaterialGenerator(color)),
        },
    ])
}

function computeExtrude(instance: Instance, by: number): Observable<Array<Instance>> {
    return of([{ attributes: { ...instance.attributes }, primitive: instance.primitive.extrude(by) }])
}

function computeComponents(
    type: "points" | "lines" | "faces",
    ...instances: Array<Instance>
): Observable<Array<Instance>> {
    const components = instances.reduce<Array<Instance>>(
        (instances, instance) => [
            ...instances,
            ...instance.primitive
                .components(type)
                .map<Instance>((primitive) => ({ attributes: { ...instance.attributes }, primitive })),
        ],
        []
    )
    return of(components)
}

function computeSplit(axis: Axis, instance: Instance, at: number, limit?: number): Observable<Array<Instance>> {
    const splits = Split(instance.primitive, axis, (matrix, index, x, y, z) => {
        if (limit == null || index < limit) {
            const sizeX = axis === Axis.X ? Math.min(at, x) : x
            const sizeZ = axis === Axis.Z ? Math.min(at, z) : z
            return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, false, instance.primitive.materialGenerator)
        } else {
            return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.primitive.materialGenerator)
        }
    }).map((primitive) => ({
        attributes: { ...instance.attributes },
        primitive,
    }))
    return of(splits)
}

function computeMultiSplit(axis: Axis, instance: Instance, ...distances: Array<number>): Observable<Array<Instance>> {
    const splits = Split(instance.primitive, axis, (matrix, index, x, y, z) => {
        const sizeX = axis === Axis.X && distances[index] != null ? Math.min(distances[index], x) : x
        const sizeZ = axis === Axis.Z && distances[index] != null ? Math.min(distances[index], z) : z

        return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, false, instance.primitive.materialGenerator)
    }).map((primitive) => ({
        attributes: { ...instance.attributes },
        primitive,
    }))
    return of(splits)
}

export const operations: Operations<any> = {
    ...defaultOperations,
    translate: {
        execute: simpleExecution<any>(computeTranslate),
        includeThis: true,
    },
    scale: {
        execute: simpleExecution<any>(computeScale),
        includeThis: true,
    },
    rotate: {
        execute: simpleExecution<any>(computeRotate),
        includeThis: true,
    },
    extrude: {
        execute: simpleExecution<any>(computeExtrude),
        includeThis: true,
    },
    splitX: {
        execute: simpleExecution<any>(computeSplit.bind(null, Axis.X)),
        includeThis: true,
    },
    splitZ: {
        execute: simpleExecution<any>(computeSplit.bind(null, Axis.Z)),
        includeThis: true,
    },
    multiSplitX: {
        execute: simpleExecution<any>(computeMultiSplit.bind(null, Axis.X)),
        includeThis: true,
    },
    multiSplitZ: {
        execute: simpleExecution<any>(computeMultiSplit.bind(null, Axis.Z)),
        includeThis: true,
    },
    toPoints: {
        execute: simpleExecution<any>(computeComponents.bind(null, "points")),
        includeThis: true,
    },
    toLines: {
        execute: simpleExecution<any>(computeComponents.bind(null, "lines")),
        includeThis: true,
    },
    toFaces: {
        execute: simpleExecution<any>(computeComponents.bind(null, "faces")),
        includeThis: true,
    },
    color: {
        execute: simpleExecution<any>(computeColorChange),
        includeThis: true,
    },
    size: {
        execute: simpleExecution<any>(computeSize),
        includeThis: true,
    },
    mapbox: {
        execute: simpleExecution<any>(computeMapbox),
        includeThis: false,
    },
    point: {
        execute: simpleExecution<any>(computePoint),
        includeThis: false,
    },
    line: {
        execute: simpleExecution<any>(computeLine),
        includeThis: false,
    },
    face: {
        execute: simpleExecution<any>(computeFace),
        includeThis: false,
    },
}
