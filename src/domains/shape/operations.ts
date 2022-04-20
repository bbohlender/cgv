import { from, map, Observable, of, shareReplay } from "rxjs"
import { LinePrimitive, loadMap, PointPrimitive } from "."
import { Operations, simpleExecution } from "../.."
import {
    makeRotationMatrix,
    makeScaleMatrix,
    makeTranslationMatrix,
    createPhongMaterialGenerator,
    FacePrimitive,
    Primitive,
    Axis,
    Split,
} from "."
import { Box3, Color, Matrix4, Shape, Vector2, Vector3 } from "three"
import * as THREE from "three"
import { defaultOperations } from ".."
import { ObjectPrimitive } from "./primitive"
import { GLTFLoader } from "three-stdlib/loaders/GLTFLoader"
import { DRACOLoader } from "three-stdlib/loaders/DRACOLoader"
import { computeGableRoof } from "./roof"

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

THREE.Cache.enabled = true

const gltfLoader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath("/cgv/")
gltfLoader.setDRACOLoader(dracoLoader)

function computeLoad(instance: Primitive, url: string) {
    return from(gltfLoader.loadAsync(url)).pipe(map((gltf) => [new ObjectPrimitive(instance.matrix, gltf.scene)]))
}

function computePoint3(x: number, y: number, z: number): Observable<Array<Primitive>> {
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))
    return of([new PointPrimitive(makeTranslationMatrix(x, y, z, new Matrix4()), redMaterialGenerator)])
}

function computePoint2(x: number, z: number): Observable<Array<Primitive>> {
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))
    return of([new PointPrimitive(makeTranslationMatrix(x, 0, z, new Matrix4()), redMaterialGenerator)])
}

const helperVector = new Vector3()

//TODO: make capable of 3d (currently only 2d)
function computeFace(...points: ReadonlyArray<Primitive>): Observable<Array<Primitive>> {
    if (points.length < 3) {
        return of([])
    }
    const points2d = points.map((point) => {
        helperVector.setFromMatrixPosition(point.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

    return of([new FacePrimitive(new Matrix4(), new Shape(points2d), redMaterialGenerator)])
}

function computeLine(...points: ReadonlyArray<Primitive>): Observable<Array<Primitive>> {
    if (points.length < 2) {
        return of([])
    }
    const [p1, p2] = points.map((point) => new Vector3().setFromMatrixPosition(point.matrix))
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))
    return of([LinePrimitive.fromPoints(new Matrix4(), p1, p2, redMaterialGenerator)])
}

function computeSample(instance: Primitive, amount: number): Observable<Array<Primitive>> {
    return of(instance.samplePoints(amount))
}

const size = new Vector3()
const box3Helper = new Box3()

function computeSize(instance: Primitive, axis: "x" | "y" | "z"): Observable<Array<any>> {
    instance.getBoundingBox(box3Helper)
    box3Helper.getSize(size)
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

function computeSplit(instance: Primitive, axis: Axis, at: number, limit?: number): Observable<Array<Primitive>> {
    const splits = Split(instance, axis, (matrix, index, x, y, z) => {
        if (limit == null || index < limit) {
            const sizeX = axis === "x" ? Math.min(at, x) : x
            const sizeZ = axis === "z" ? Math.min(at, z) : z
            return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, false, instance.materialGenerator)
        } else {
            return FacePrimitive.fromLengthAndHeight(matrix, x, z, false, instance.materialGenerator)
        }
    })
    return of(splits)
}

function computeMultiSplit(instance: Primitive, axis: Axis, ...distances: Array<number>): Observable<Array<Primitive>> {
    const splits = Split(instance, axis, (matrix, index, x, y, z) => {
        const sizeX = axis === "x" && distances[index] != null ? Math.min(distances[index], x) : x
        const sizeZ = axis === "z" && distances[index] != null ? Math.min(distances[index], z) : z

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
    split: {
        execute: simpleExecution<any, unknown>(computeSplit),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: "x" }), () => ({ type: "raw", value: 10 })],
    },
    multiSplit: {
        execute: simpleExecution<any, unknown>(computeMultiSplit),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: "x" })],
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
    sample: {
        execute: simpleExecution<any, unknown>(computeSample),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 100 })],
    },
    color: {
        execute: simpleExecution<any, unknown>(computeColorChange),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: "#ff0000" })],
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
    load: {
        execute: simpleExecution<any, unknown>(computeLoad),
        includeThis: true,
        defaultParameters: [],
    },
    point3: {
        execute: simpleExecution<any, unknown>(computePoint3),
        includeThis: false,
        defaultParameters: [
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
        ],
    },
    point2: {
        execute: simpleExecution<any, unknown>(computePoint2),
        includeThis: false,
        defaultParameters: [() => ({ type: "raw", value: 0 }), () => ({ type: "raw", value: 0 })],
    },
    line: {
        execute: simpleExecution<any, unknown>(computeLine),
        includeThis: false,
        defaultParameters: [
            () => ({
                type: "operation",
                identifier: "point3",
                children: [
                    { type: "raw", value: 0 },
                    { type: "raw", value: 0 },
                    { type: "raw", value: 0 },
                ],
            }),
            () => ({
                type: "operation",
                identifier: "point3",
                children: [
                    { type: "raw", value: 100 },
                    { type: "raw", value: 0 },
                    { type: "raw", value: 0 },
                ],
            }),
        ],
    },
    face: {
        execute: simpleExecution<any, unknown>(computeFace),
        includeThis: false,
        defaultParameters: [],
    },
    gableRoof: {
        execute: simpleExecution<any, unknown>(computeGableRoof),
        includeThis: true,
        defaultParameters: [],
    },
}
