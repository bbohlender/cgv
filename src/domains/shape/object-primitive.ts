import { Geom2 } from "@jscad/modeling/src/geometries/types"
import { Primitive } from "co-3gen"
import { Matrix4, Vector3, Object3D, Event, BufferGeometry } from "three"

export class ObjectPrimitive extends Primitive {
    matrix = new Matrix4()

    get pointAmount(): number {
        return 0
    }

    getPoint(index: number, target: Vector3): void {
        throw new Error("Method not implemented.")
    }

    protected componentArray(type: number): Primitive[] {
        throw new Error("Method not implemented.")
    }

    protected computeObject3D(): Object3D<Event> {
        return this.object
    }

    clone(): Primitive {
        return new ObjectPrimitive(this.object.clone(true))
    }

    protected computeGeometry(): BufferGeometry | undefined {
        throw new Error("Method not implemented.")
    }
    protected computePolygons(): [Geom2, Matrix4][] {
        throw new Error("Method not implemented.")
    }

    constructor(private object: Object3D) {
        super()
    }
}
