import { from, map, Observable, of } from "rxjs"
import { LinePrimitive, PointPrimitive } from "."
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
import { Box3, Color, Shape, ShapeUtils, Vector2, Vector3 } from "three"
import * as THREE from "three"
import { defaultOperations } from ".."
import { ObjectPrimitive } from "./primitive"
import { GLTFLoader } from "three-stdlib/loaders/GLTFLoader"
import { DRACOLoader } from "three-stdlib/loaders/DRACOLoader"
import { computeGableRoof } from "./roof"
import { createGraph, expandGraph, getDirection, YAXIS, ZAXIS } from "./primitive-utils"

function computeGraphExpand(
    instance: Primitive,
    distance: number,
    ...lines: Array<LinePrimitive>
): Observable<Array<Primitive>> {
    return of(
        expandGraph(
            createGraph(
                lines.map((line) => [line.getStart(), line.getEnd()]),
                YAXIS,
                distance
            ),
            distance,
            0,
            YAXIS,
            instance.materialGenerator
        )
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

function computePoint3(instance: Primitive, x: number, y: number, z: number): Observable<Array<Primitive>> {
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))
    return of([new PointPrimitive(makeTranslationMatrix(x, y, z, instance.matrix.clone()), redMaterialGenerator)])
}

function computePoint2(instance: Primitive, x: number, z: number): Observable<Array<Primitive>> {
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))
    return of([new PointPrimitive(makeTranslationMatrix(x, 0, z, instance.matrix.clone()), redMaterialGenerator)])
}

const helperVector = new Vector3()

function computeFace(instance: Primitive, ...points: ReadonlyArray<Primitive>): Observable<Array<Primitive>> {
    if (points.length < 3) {
        return of([instance])
    }
    const points2d = points.map((point) => {
        helperVector.setFromMatrixPosition(point.matrix)
        return new Vector2(helperVector.x, helperVector.z)
    })
    if (ShapeUtils.isClockWise(points2d)) {
        points2d.reverse()
    }
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))

    return of([new FacePrimitive(instance.matrix, new Shape(points2d), redMaterialGenerator)])
}

function computeLine(instance: Primitive, ...points: ReadonlyArray<Primitive>): Observable<Array<Primitive>> {
    if (points.length < 2) {
        return of([instance])
    }
    const [p1, p2] = points.map((point) => new Vector3().setFromMatrixPosition(point.matrix))
    const redMaterialGenerator = createPhongMaterialGenerator(new Color(0xff0000))
    return of([LinePrimitive.fromPoints(instance.matrix.clone(), p1, p2, redMaterialGenerator)])
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

function computeSplit(
    instance: Primitive,
    axis: Axis,
    repetitions: boolean | number,
    ...sizes: Array<number>
): Observable<Array<Primitive>> {
    if (sizes.length === 0) {
        return of([instance])
    }

    const splits = Split(instance, axis, (matrix, index, x, y, z) => {
        const repetitionIndex = Math.floor(index / sizes.length)
        const size = sizes[index % sizes.length]
        if ((repetitions === false && repetitionIndex == 0) || repetitions === true || repetitionIndex < repetitions) {
            const sizeX = axis === "x" ? Math.min(size, x) : x
            const sizeZ = axis === "z" ? Math.min(size, z) : z
            return FacePrimitive.fromLengthAndHeight(matrix, sizeX, sizeZ, ZAXIS, instance.materialGenerator)
        } else {
            return FacePrimitive.fromLengthAndHeight(matrix, x, z, ZAXIS, instance.materialGenerator)
        }
    })
    return of(splits)
}

function computeDirection(instance: Primitive): Observable<Array<any>> {
    return of([getDirection(instance.matrix)])
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
        defaultParameters: [() => ({ type: "raw", value: 1 })],
    },
    split: {
        execute: simpleExecution<any, unknown>(computeSplit),
        includeThis: true,
        defaultParameters: [
            () => ({ type: "raw", value: "x" }),
            () => ({ type: "raw", value: true }),
            () => ({ type: "raw", value: 1 }),
        ],
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
        defaultParameters: [() => ({ type: "raw", value: 10 })],
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
    /*mapbox: {
        execute: simpleExecution<any, unknown>(computeMapbox),
        includeThis: true,
        defaultParameters: [],
    },*/
    expandGraph: {
        execute: simpleExecution<any, unknown>(computeGraphExpand),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 3 })],
    },
    load: {
        execute: simpleExecution<any, unknown>(computeLoad),
        includeThis: true,
        defaultParameters: [],
    },
    point3: {
        execute: simpleExecution<any, unknown>(computePoint3),
        includeThis: true,
        defaultParameters: [
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
            () => ({ type: "raw", value: 0 }),
        ],
    },
    point2: {
        execute: simpleExecution<any, unknown>(computePoint2),
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 0 }), () => ({ type: "raw", value: 0 })],
    },
    line: {
        execute: simpleExecution<any, unknown>(computeLine),
        includeThis: true,
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
                    { type: "raw", value: 1 },
                    { type: "raw", value: 0 },
                    { type: "raw", value: 0 },
                ],
            }),
        ],
    },
    face: {
        execute: simpleExecution<any, unknown>(computeFace),
        includeThis: true,
        defaultParameters: [],
    },
    gableRoof: {
        execute: simpleExecution<any, unknown>(computeGableRoof),
        includeThis: true,
        defaultParameters: [
            () => ({
                type: "raw",
                value: 0,
            }),
        ],
    },
    direction: {
        execute: simpleExecution<any, unknown>(computeDirection),
        includeThis: true,
        defaultParameters: [],
    },
}
