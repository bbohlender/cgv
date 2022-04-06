import {
    Box2,
    Box3,
    BufferGeometry,
    Color,
    Line,
    LineBasicMaterial,
    Material,
    Matrix4,
    Mesh,
    MeshPhongMaterial,
    Object3D,
    Path,
    Points,
    PointsMaterial,
    Shape,
    ShapeBufferGeometry,
    Vector2,
    Vector3,
} from "three"
import { mergeBufferGeometries } from "three-stdlib/utils/BufferGeometryUtils"
import { computeDirectionMatrix, makeRotationMatrix, makeTranslationMatrix } from "."

export type MaterialGenerator = (type: ObjectType) => Material

export function createPhongMaterialGenerator(color: Color): MaterialGenerator {
    return (type) => {
        switch (type) {
            case ObjectType.Point:
                return new PointsMaterial({ toneMapped: false, color })
            case ObjectType.Line:
                return new LineBasicMaterial({ toneMapped: false, color })
            case ObjectType.Mesh:
                return new MeshPhongMaterial({ toneMapped: false, color })
        }
    }
}

const helperMatrix = new Matrix4()
const helperVector = new Vector3()

function setupObject3D(object: Object3D, matrix: Matrix4): Object3D {
    object.matrixAutoUpdate = false
    object.matrix = matrix
    return object
}

export enum ObjectType {
    Point,
    Line,
    Mesh,
}

export abstract class Primitive {
    public abstract readonly matrix: Matrix4

    private geometryCache: BufferGeometry | null | undefined = null
    private objectCache: Object3D | null = null

    getGeometry(): BufferGeometry | undefined {
        if (this.geometryCache === null) {
            this.geometryCache = this.computeGeometry()
        }
        return this.geometryCache
    }

    getObject(): Object3D {
        if (this.objectCache === null) {
            this.objectCache = this.computeObject3D()
        }
        return this.objectCache
    }

    dispose(): void {
        this.geometryCache?.dispose()
    }

    protected abstract changeMatrix(matrix: Matrix4): Primitive

    abstract changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive

    abstract get materialGenerator(): MaterialGenerator

    //abstract applyMatrixToGeometry(matrix: Matrix4): void;

    multiplyMatrix(matrix: Matrix4): Primitive {
        return this.changeMatrix(this.matrix.clone().multiply(matrix))
    }

    premultiplyMatrix(matrix: Matrix4): Primitive {
        return this.changeMatrix(this.matrix.clone().premultiply(matrix))
    }

    abstract extrude(by: number): Primitive
    abstract components(type: "points" | "lines" | "faces"): Array<Primitive>
    protected abstract computeObject3D(): Object3D
    abstract getGeometrySize(target: Vector3): void
    protected abstract computeGeometry(): BufferGeometry | undefined
}

export class PointPrimitive extends Primitive {
    changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive {
        return new PointPrimitive(this.matrix, generator)
    }

    protected changeMatrix(matrix: Matrix4): Primitive {
        return new PointPrimitive(matrix, this.materialGenerator)
    }

    multiplyMatrix(matrix: Matrix4): Primitive {
        return new PointPrimitive(this.matrix.clone().multiply(matrix), this.materialGenerator)
    }

    constructor(public readonly matrix: Matrix4, public materialGenerator: (type: ObjectType) => Material) {
        super()
    }

    getGeometrySize(target: Vector3): void {
        target.set(0, 0, 0)
    }

    extrude(by: number): Primitive {
        return new LinePrimitive(this.matrix, by, this.materialGenerator)
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        if (type === "points") {
            return [this.clone()]
        } else {
            return []
        }
    }
    computeObject3D(): Object3D {
        return setupObject3D(
            new Points(new BufferGeometry().setFromPoints([new Vector3()]), this.materialGenerator(ObjectType.Point)),
            this.matrix
        )
    }

    clone(): Primitive {
        return new PointPrimitive(this.matrix, this.materialGenerator)
    }

    protected computeGeometry(): BufferGeometry | undefined {
        return undefined
    }
}

const YAXIS = new Vector3(0, 1, 0)

/**
 * line in x direction
 */
export class LinePrimitive extends Primitive {
    changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive {
        return new LinePrimitive(this.matrix, this.length, generator)
    }

    protected changeMatrix(matrix: Matrix4): Primitive {
        return new LinePrimitive(matrix, this.length, this.materialGenerator)
    }

    constructor(
        public readonly matrix: Matrix4,
        private readonly length: number,
        public materialGenerator: (type: ObjectType) => Material
    ) {
        super()
    }

    static fromPoints(
        matrix: Matrix4,
        p1: Vector3,
        p2: Vector3,
        materialGenerator: (type: ObjectType) => Material
    ): LinePrimitive {
        matrix.multiply(makeTranslationMatrix(p1.x, p1.y, p1.z))
        helperVector.copy(p2).sub(p1)
        const length = helperVector.length()
        matrix.multiply(computeDirectionMatrix(helperVector.normalize(), YAXIS))
        return new LinePrimitive(matrix, length, materialGenerator)
    }

    getGeometrySize(target: Vector3): void {
        target.set(0, this.length, 0)
    }

    clone(): Primitive {
        return new LinePrimitive(this.matrix, this.length, this.materialGenerator)
    }

    extrude(by: number): Primitive {
        return FacePrimitive.fromLengthAndHeight(this.matrix, this.length, by, true, this.materialGenerator)
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        switch (type) {
            case "faces":
                return []
            case "lines":
                return [this.clone()]
            case "points": {
                const end = new PointPrimitive(
                    this.matrix.clone().multiply(helperMatrix.makeTranslation(this.length, 0, 0)),
                    this.materialGenerator
                )
                return [new PointPrimitive(this.matrix, this.materialGenerator), end]
            }
        }
    }

    computeObject3D(): Object3D {
        return setupObject3D(
            new Line(
                new BufferGeometry().setFromPoints([new Vector3(), new Vector3(this.length, 0, 0)]),
                this.materialGenerator(ObjectType.Line)
            ),
            this.matrix
        )
    }

    protected computeGeometry(): BufferGeometry | undefined {
        return undefined
    }
}

const boxHelper = new Box2()
const vec2Helper = new Vector2()

const invertMatrix = new Matrix4()

/**
 * face in x, z axis
 */
export class FacePrimitive extends Primitive {
    changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive {
        return new FacePrimitive(this.matrix, this.shape, generator)
    }

    protected changeMatrix(matrix: Matrix4): Primitive {
        return new FacePrimitive(matrix, this.shape, this.materialGenerator)
    }

    constructor(
        public readonly matrix: Matrix4,
        private readonly shape: Shape,
        public materialGenerator: (type: ObjectType) => Material
    ) {
        super()
    }

    static fromLengthAndHeight(
        matrix: Matrix4,
        x: number,
        z: number,
        yUp: boolean,
        materialGenerator: (type: ObjectType) => Material
    ): FacePrimitive {
        if (yUp) {
            matrix.multiply(helperMatrix.makeRotationX(-Math.PI / 2))
        }
        const points = [new Vector2(x, 0), new Vector2(x, z), new Vector2(0, z), new Vector2(0, 0)]
        const shape = new Shape(points)
        return new FacePrimitive(matrix, shape, materialGenerator)
    }

    getGeometrySize(target: Vector3): void {
        boxHelper.setFromPoints(this.shape.getPoints()).getSize(vec2Helper)
        target.set(vec2Helper.x, 0, vec2Helper.y)
    }

    protected computeGeometry(): BufferGeometry | undefined {
        const geometry = new ShapeBufferGeometry(this.shape)
        let temp: number
        for (let i = 0; i < geometry.index!.count; i += 3) {
            // swap the first and third values
            temp = geometry.index!.getX(i)
            geometry.index!.setX(i, geometry.index!.getX(i + 2))
            geometry.index!.setX(i + 2, temp)
        }
        geometry.rotateX(Math.PI / 2)
        return geometry
    }

    invert(): FacePrimitive {
        const newMatrix = this.matrix.clone()
        newMatrix.multiply(makeRotationMatrix(Math.PI, 0, 0))
        const points = this.shape.getPoints(5)
        const holes = this.shape.holes
        const newShape = new Shape(points.map(({ x, y }) => new Vector2(x, -y)))
        newShape.holes = holes.map((hole) => new Path(hole.getPoints().map(({ x, y }) => new Vector2(x, -y))))
        return new FacePrimitive(newMatrix, newShape, this.materialGenerator)
    }

    extrude(by: number): Primitive {
        invertMatrix.copy(this.matrix).invert()
        const top = this.multiplyMatrix(invertMatrix.multiply(makeTranslationMatrix(0, by, 0)))
        const points = this.shape.extractPoints(5).shape
        return new CombinedPrimitive(this.matrix, [
            ...points.map((p1, i) => {
                const p2 = points[(i + 1) % points.length]
                helperVector.set(p2.x - p1.x, 0, p2.y - p1.y)
                const length = helperVector.length()
                const matrix = makeTranslationMatrix(p1.x, 0, p1.y, new Matrix4())
                matrix.multiply(computeDirectionMatrix(helperVector.normalize(), YAXIS))
                const result = FacePrimitive.fromLengthAndHeight(matrix, length, by, true, this.materialGenerator)
                if (by < 0) {
                    return result.invert()
                }
                return result
            }),
            top,
        ])
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        switch (type) {
            case "points":
                return this.shape
                    .extractPoints(5)
                    .shape.map(
                        (point) =>
                            new PointPrimitive(
                                this.matrix.clone().multiply(makeTranslationMatrix(point.x, 0, point.y)),
                                this.materialGenerator
                            )
                    )
            case "lines": {
                const points = this.shape.extractPoints(5).shape
                return points.map((point, i) => {
                    const nextPoint = points[(i + 1) % points.length]
                    return LinePrimitive.fromPoints(
                        this.matrix.clone(),
                        new Vector3(point.x, 0, point.y),
                        new Vector3(nextPoint.x, 0, nextPoint.y),
                        this.materialGenerator
                    )
                })
            }
            case "faces":
                return [this]
        }
    }

    computeObject3D(): Object3D {
        return setupObject3D(new Mesh(this.getGeometry(), this.materialGenerator(ObjectType.Mesh)), this.matrix)
    }
}

const box3Helper = new Box3()

export class GeometryPrimitive extends Primitive {
    changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive {
        return new GeometryPrimitive(this.matrix, this.geometry, generator)
    }

    protected changeMatrix(matrix: Matrix4): Primitive {
        return new GeometryPrimitive(matrix, this.geometry, this.materialGenerator)
    }
    constructor(
        public readonly matrix: Matrix4,
        private readonly geometry: BufferGeometry,
        public materialGenerator: (type: ObjectType) => Material
    ) {
        super()
    }

    extrude(by: number): Primitive {
        throw new Error("Method not implemented.")
    }
    components(type: "points" | "lines" | "faces"): Primitive[] {
        throw new Error("Method not implemented.")
    }
    computeObject3D(): Object3D {
        return setupObject3D(new Mesh(this.getGeometry(), this.materialGenerator(ObjectType.Mesh)), this.matrix)
    }

    getGeometrySize(target: Vector3): void {
        this.geometry.computeBoundingBox()
        this.geometry.boundingBox!.getSize(target)
    }

    computeGeometry(): BufferGeometry | undefined {
        return this.geometry
    }
}

export class CombinedPrimitive extends Primitive {
    changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive {
        return new CombinedPrimitive(
            this.matrix,
            this.primitives.map((primitive) => primitive.changeMaterialGenerator(generator))
        )
    }

    get materialGenerator(): MaterialGenerator {
        throw new Error(`can't retrive material from combined primitive`)
    }

    protected changeMatrix(matrix: Matrix4): Primitive {
        return new CombinedPrimitive(matrix, this.primitives)
    }
    constructor(public readonly matrix: Matrix4, private readonly primitives: Array<Primitive>) {
        super()
    }

    extrude(by: number): Primitive {
        return new CombinedPrimitive(
            this.matrix,
            this.primitives.map((primitive) => primitive.extrude(by))
        )
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        const results = this.primitives.map((primitive) => primitive.components(type)).reduce((v1, v2) => v1.concat(v2))
        return results.map((result) => result.premultiplyMatrix(this.matrix))
    }

    computeObject3D(): Object3D {
        const object = setupObject3D(new Object3D(), this.matrix)
        this.primitives.forEach((primitive) => object.add(primitive.getObject()))
        return object
    }

    getGeometrySize(target: Vector3): void {
        box3Helper.makeEmpty()
        this.primitives.forEach((primitive) => {
            primitive.getGeometrySize(helperVector)
            helperVector.applyMatrix4(primitive.matrix)
            box3Helper.expandByPoint(helperVector)
        })
        box3Helper.getSize(target)
    }

    protected computeGeometry(): BufferGeometry | undefined {
        const disposableBuffers = this.primitives
            .map((primitive) => primitive.getGeometry()?.applyMatrix4(primitive.matrix))
            .filter(filterNull)
        const result = mergeBufferGeometries(disposableBuffers)!
        disposableBuffers.forEach((buffer) => buffer.dispose())
        return result
    }
}

function filterNull<T>(val: T | null | undefined): val is T {
    return val != null
}

/*export class EmptyPrimitive extends Primitive {
    constructor(public matrix: Matrix4, public readonly size: Vector3) {
        super()
    }

    extrude(by: number): Primitive {
        const resultSize = this.size.clone()
        resultSize.y += by
        return new EmptyPrimitive(this.matrix.clone(), resultSize)
    }

    components(type: "points" | "lines" | "faces"): Primitive[] {
        return []
    }
    toObject3D(): Object3D<Event> {
        return setupObject3D(new Object3D(), this.matrix)
    }

    getGeometrySize(target: Vector3): void {
        target.copy(this.size)
    }

    computeGeometry(): BufferGeometry | undefined {
        return undefined
    }
}*/
