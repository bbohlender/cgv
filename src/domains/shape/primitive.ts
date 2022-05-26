import {
    Box2,
    Box3,
    BoxBufferGeometry,
    BufferGeometry,
    Color,
    EdgesGeometry,
    Event,
    Line,
    LineBasicMaterial,
    LineSegments,
    Material,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    MeshPhongMaterial,
    Object3D,
    Path,
    Points,
    PointsMaterial,
    Shape,
    ShapeBufferGeometry,
    ShapeUtils,
    Vector2,
    Vector3,
} from "three"
import { mergeBufferGeometries } from "three-stdlib/utils/BufferGeometryUtils"
import { computeDirectionMatrix, makeRotationMatrix, makeTranslationMatrix, YAXIS } from "."
import { filterNull } from "../../util"
import { distributeOverSizes, makeScaleMatrix } from "./math"
import { sampleGeometry } from "./sample"

export type MaterialGenerator = (type: ObjectType) => Material

export function createPhongMaterialGenerator(color: Color): MaterialGenerator {
    return (type) => {
        switch (type) {
            case ObjectType.Point:
                return new PointsMaterial({ size: 3e-8, toneMapped: false, color })
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
    object.updateMatrixWorld(true)
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
    private outlineCache: Object3D | null = null

    getGeometry(): BufferGeometry | undefined {
        if (this.geometryCache === null) {
            this.geometryCache = this.computeGeometry()
        }
        return this.geometryCache
    }

    getOutline(): Object3D {
        if (this.outlineCache === null) {
            this.outlineCache = this.computeOutline()
        }
        return this.outlineCache
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

    abstract getSize(dimension: number): number
    abstract extrude(by: number): Primitive
    abstract samplePoints(amount: number): Array<Primitive>
    abstract components(type: "points" | "lines" | "faces"): Array<Primitive>
    protected abstract computeObject3D(): Object3D
    abstract getBoundingBox(target: Box3): void
    abstract getVertecies(): Array<Vector3>
    protected abstract computeGeometry(): BufferGeometry | undefined
    protected abstract computeOutline(): Object3D
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

    getBoundingBox(target: Box3): void {
        target.min.set(0, 0, 0)
        target.max.set(0, 0, 0)
    }

    getVertecies(): Vector3[] {
        return [new Vector3()]
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

    protected computeOutline(): Object3D<Event> {
        const point = new Points(
            new BufferGeometry().setFromPoints([new Vector3()]),
            new PointsMaterial({
                color: 0,
                size: 3e-8,
                transparent: true,
                depthTest: false,
            })
        )
        point.renderOrder = 1000
        return setupObject3D(point, this.matrix)
    }

    clone(): Primitive {
        return new PointPrimitive(this.matrix, this.materialGenerator)
    }

    protected computeGeometry(): BufferGeometry | undefined {
        return undefined
    }

    expand(type: "inside" | "outside" | "both", by: number, normal: Vector3): Primitive {
        throw new Error("Method not implemented.")
    }

    getSize(dimension: number): number {
        if (dimension === 0) {
            return 1
        }
        return 0
    }

    samplePoints(amount: number): Primitive[] {
        return new Array(amount).fill(null).map(() => this.clone())
    }
}

/**
 * line in x direction
 */
export class LinePrimitive extends Primitive {
    changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive {
        return new LinePrimitive(this.matrix, this.length, generator)
    }

    getStart(): Vector3 {
        return new Vector3(0, 0, 0).applyMatrix4(this.matrix)
    }

    getEnd(): Vector3 {
        return new Vector3(this.length, 0, 0).applyMatrix4(this.matrix)
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

    getVertecies(): Vector3[] {
        return [new Vector3(), new Vector3(this.length, 0, 0)]
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

    getBoundingBox(target: Box3): void {
        target.min.set(0, 0, 0)
        target.max.set(this.length, 0, 0)
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

    protected computeOutline(): Object3D<Event> {
        const line = new Line(
            new BufferGeometry().setFromPoints([new Vector3(), new Vector3(this.length, 0, 0)]),
            new LineBasicMaterial({
                color: 0,
                transparent: true,
                depthTest: false,
            })
        )
        line.renderOrder = 1000
        return setupObject3D(line, this.matrix)
    }

    protected computeGeometry(): BufferGeometry | undefined {
        return undefined
    }

    getSize(dimension: number): number {
        if (dimension === 1) {
            return this.length
        }
        return 0
    }
    samplePoints(amount: number): Primitive[] {
        return new Array(amount)
            .fill(null)
            .map(
                () =>
                    new PointPrimitive(
                        this.matrix.clone().multiply(helperMatrix.makeTranslation(Math.random() * this.length, 0, 0)),
                        this.materialGenerator
                    )
            )
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

    getVertecies(): Vector3[] {
        return this.shape.getPoints().map(({ x, y }) => new Vector3(x, 0, y))
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

    getBoundingBox(target: Box3): void {
        boxHelper.setFromPoints(this.shape.getPoints())
        target.min.set(boxHelper.min.x, 0, boxHelper.min.y)
        target.max.set(boxHelper.max.x, 0, boxHelper.max.y)
    }

    protected computeGeometry(): BufferGeometry | undefined {
        const geometry = new ShapeBufferGeometry(this.shape)
        invertWinding(geometry)
        swapYZ(geometry)
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
        const points = this.shape.getPoints(5)
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

    protected computeOutline(): Object3D<Event> {
        const outerPath = this.pathToOutline(this.shape.extractPoints(5).shape)
        const innerPaths = this.shape.holes.map((path) => this.pathToOutline(path.getPoints(5)))
        const result = setupObject3D(new Object3D(), this.matrix)
        result.renderOrder = 1000
        result.add(outerPath, ...innerPaths)
        const faceHighlight = new Mesh(
            this.getGeometry(),
            new MeshBasicMaterial({
                transparent: true,
                opacity: 0.5,
                color: 0xffffff
            })
        )
        result.add(faceHighlight)
        return result
    }

    private pathToOutline(path: Array<Vector2>): Object3D {
        if (path.length === 0) {
            return new Object3D()
        }
        path.push(path[0])
        const geometry = new BufferGeometry().setFromPoints(path)
        swapYZ(geometry)
        return new Line(
            geometry,
            new MeshBasicMaterial({
                color: 0,
                transparent: true
            })
        )
    }

    expand(type: "inside" | "outside" | "both", by: number, normal: Vector3): Primitive {
        throw new Error(`not implemented`)
    }

    getSize(dimension: number): number {
        if (dimension === 2) {
            const contourArea = ShapeUtils.area(this.shape.getPoints(5))
            return this.shape.holes.reduce((prev, hole) => prev - ShapeUtils.area(hole.getPoints(5)), contourArea)
        }
        return 0
    }

    samplePoints(amount: number): Primitive[] {
        const geometry = this.getGeometry()
        if (geometry == null) {
            return []
        }
        return sampleGeometry(geometry, amount).map(
            (position) =>
                new PointPrimitive(
                    this.matrix.clone().multiply(makeTranslationMatrix(position.x, position.y, position.z)),
                    this.materialGenerator
                )
        )
    }
}

function swapYZ(geometry: BufferGeometry): void {
    let temp: number
    const positionAttribute = geometry.getAttribute("position")
    for (let i = 0; i < positionAttribute.count; i++) {
        // swap the first and third values
        temp = positionAttribute.getY(i)
        positionAttribute.setY(i, positionAttribute.getZ(i))
        positionAttribute.setZ(i, temp)
    }
}

function invertWinding(geometry: BufferGeometry): void {
    let temp: number
    for (let i = 0; i < geometry.index!.count; i += 3) {
        // swap the first and third values
        temp = geometry.index!.getX(i)
        geometry.index!.setX(i, geometry.index!.getX(i + 2))
        geometry.index!.setX(i + 2, temp)
    }
}

const box3Helper = new Box3()

const boxGeometry = new BoxBufferGeometry(1, 1, 1)
const outlineGeometry = new EdgesGeometry(boxGeometry)

export class ObjectPrimitive extends Primitive {
    get materialGenerator(): MaterialGenerator {
        throw new Error("Method not implemented.")
    }

    changeMaterialGenerator(generator: (type: ObjectType) => Material): Primitive {
        return this
    }

    getVertecies(): Vector3[] {
        throw new Error("Method not implemented.")
    }

    protected changeMatrix(matrix: Matrix4): Primitive {
        return new ObjectPrimitive(matrix, this.object)
    }
    constructor(public readonly matrix: Matrix4, private readonly object: Object3D) {
        super()
        this.computeObject3D()
    }

    extrude(by: number): Primitive {
        throw new Error("Method not implemented.")
    }
    components(type: "points" | "lines" | "faces"): Primitive[] {
        throw new Error("Method not implemented.")
    }
    computeObject3D(): Object3D {
        const wrapper = new Object3D()
        wrapper.add(this.object)
        return setupObject3D(wrapper, this.matrix)
    }

    computeGeometry(): BufferGeometry | undefined {
        return undefined
    }

    getBoundingBox(target: Box3): void {
        getLocalBoundingBox(this.object, target)
    }

    protected computeOutline(): Object3D<Event> {
        this.getBoundingBox(box3Helper)
        box3Helper.getCenter(helperVector)
        const matrix = this.matrix
            .clone()
            .multiply(makeTranslationMatrix(helperVector.x, helperVector.y, helperVector.z))
        box3Helper.getSize(helperVector)
        matrix.multiply(makeScaleMatrix(helperVector.x, helperVector.y, helperVector.z))
        const lines = new LineSegments(
            outlineGeometry,
            new LineBasicMaterial({
                transparent: true,
                depthTest: false,
                color: 1,
            })
        )
        const faces = new Mesh(
            boxGeometry,
            new MeshBasicMaterial({
                transparent: true,
                opacity: 0.5,
                color: 0xffffff,
                depthTest: false,
            })
        )
        const result = setupObject3D(new Object3D(), matrix)
        result.renderOrder = 1000
        result.add(lines)
        result.add(faces)
        return result
    }

    expand(type: "inside" | "outside" | "both", by: number, normal: Vector3): Primitive {
        throw new Error("Method not implemented.")
    }

    getSize(dimension: number): number {
        throw new Error("Method not implemented.")
    }

    samplePoints(amount: number): Primitive[] {
        throw new Error("Method not implemented.")
    }
}

function getLocalBoundingBox(object: Object3D, target?: Box3): Box3 {
    target = target ?? new Box3()
    if (object instanceof Mesh) {
        ;(object.geometry as BufferGeometry).computeBoundingBox()
        target.copy((object.geometry as BufferGeometry).boundingBox!)
    } else {
        target.makeEmpty()
    }
    for (const child of object.children) {
        if (child.children.length === 0 && !(child instanceof Mesh)) {
            continue
        }
        const box = getLocalBoundingBox(child).applyMatrix4(child.matrix)
        target.union(box)
    }
    return target
}

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
        geometry.computeBoundingBox()
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

    getVertecies(): Vector3[] {
        throw new Error("Method not implemented.")
    }

    getBoundingBox(target: Box3): void {
        target.copy(this.geometry.boundingBox!)
    }

    computeGeometry(): BufferGeometry | undefined {
        return this.geometry
    }
    protected computeOutline(): Object3D<Event> {
        this.geometry.boundingBox!.getCenter(helperVector)
        const matrix = this.matrix
            .clone()
            .multiply(makeTranslationMatrix(helperVector.x, helperVector.y, helperVector.z))
        this.geometry.boundingBox!.getSize(helperVector)
        matrix.multiply(makeScaleMatrix(helperVector.x, helperVector.y, helperVector.z))
        const lines = new LineSegments(
            outlineGeometry,
            new LineBasicMaterial({
                transparent: true,
                depthTest: false,
                color: 1,
            })
        )
        const faces = new Mesh(
            boxGeometry,
            new MeshBasicMaterial({
                transparent: true,
                opacity: 0.5,
                color: 0xffffff,
                depthTest: false,
            })
        )
        const result = setupObject3D(new Object3D(), matrix)
        result.renderOrder = 1000
        result.add(lines)
        result.add(faces)
        return result
    }

    expand(type: "inside" | "outside" | "both", by: number, normal: Vector3): Primitive {
        throw new Error("Method not implemented.")
    }
    getSize(dimension: number): number {
        throw new Error("Method not implemented.")
    }
    samplePoints(amount: number): Primitive[] {
        const geometry = this.getGeometry()
        if (geometry == null) {
            return []
        }
        return sampleGeometry(geometry, amount).map(
            (position) =>
                new PointPrimitive(
                    this.matrix.clone().multiply(makeTranslationMatrix(position.x, position.y, position.z)),
                    this.materialGenerator
                )
        )
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
        return this.primitives[0].materialGenerator
    }

    protected changeMatrix(matrix: Matrix4): Primitive {
        return new CombinedPrimitive(matrix, this.primitives)
    }
    constructor(public readonly matrix: Matrix4, private readonly primitives: Array<Primitive>) {
        super()
    }

    getVertecies(): Vector3[] {
        return this.primitives.reduce<Array<Vector3>>(
            (prev, primitive) =>
                prev.concat(primitive.getVertecies().map((vertex) => vertex.applyMatrix4(primitive.matrix))),
            []
        )
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

    getBoundingBox(target: Box3): void {
        target.makeEmpty()
        this.primitives.forEach((primitive) => {
            primitive.getBoundingBox(box3Helper)
            box3Helper.applyMatrix4(primitive.matrix)
            target.union(box3Helper)
        })
    }

    protected computeGeometry(): BufferGeometry | undefined {
        const disposableBuffers = this.primitives
            .map((primitive) => primitive.getGeometry()?.applyMatrix4(primitive.matrix))
            .filter(filterNull)
        const result = mergeBufferGeometries(disposableBuffers)!
        disposableBuffers.forEach((buffer) => buffer.dispose())
        return result
    }

    protected computeOutline(): Object3D {
        const object = setupObject3D(new Object3D(), this.matrix)
        this.primitives.forEach((primitive) => object.add(primitive.getOutline()))
        object.renderOrder = 1000
        return object
    }
    getSize(dimension: number): number {
        return this.primitives.reduce((prev, primitive) => primitive.getSize(dimension) + prev, 0)
    }

    samplePoints(amount: number): Primitive[] {
        const sizes = this.primitives.map((primitive) => primitive.getSize(2))
        const amounts = distributeOverSizes(sizes, amount)
        const result: Array<Primitive> = []
        for (let index = 0; index < amounts.length; index++) {
            const amountAtIndex = amounts[index]
            if (amountAtIndex == null) {
                continue
            }
            result.push(...this.primitives[index].samplePoints(amountAtIndex))
        }
        return result
    }
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

    computeGeometry(): BufferGeometry | undefined {
        return undefined
    }
}*/
