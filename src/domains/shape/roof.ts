import { Observable, of } from "rxjs"
import { Box3, ExtrudeGeometry, Matrix4, Shape, Vector2, Vector3 } from "three"
import { makeRotationMatrix, makeTranslationMatrix } from "./math"
import { GeometryPrimitive, Primitive } from "./primitive"

class PrismGeometry extends ExtrudeGeometry {
    constructor(width: number, height: number, depth: number) {
        super(new Shape([new Vector2(0, 0), new Vector2(width / 2, height), new Vector2(width, 0)]), {
            depth,
            bevelEnabled: false,
        })
    }
}

const box3Helper = new Box3()
const vectorHelper = new Vector3()

export function computeGableRoof(
    instance: Primitive,
    rotation?: number,
    width?: number,
    height?: number,
    depth?: number
): Observable<Array<Primitive>> {
    const yRotation = rotation == null ? 0 : (Math.PI * rotation) / 180
    const matrix = makeRotationMatrix(0, -yRotation, 0)
    box3Helper.setFromPoints(instance.getVertecies().map((vertex) => vertex.applyMatrix4(matrix)))
    box3Helper.getSize(vectorHelper)
    const geometry = new PrismGeometry(width ?? vectorHelper.x, height ?? vectorHelper.y, depth ?? vectorHelper.z)
    geometry.translate(box3Helper.min.x, box3Helper.min.y, box3Helper.min.z)
    geometry.computeBoundingBox()
    geometry.rotateY(yRotation)
    return of([new GeometryPrimitive(instance.matrix, geometry, instance.materialGenerator)])
}
