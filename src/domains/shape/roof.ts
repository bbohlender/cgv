import { Observable, of } from "rxjs"
import { Box3, ExtrudeGeometry, Shape, Vector2, Vector3 } from "three"
import { makeTranslationMatrix } from "./math"
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
    width?: number,
    height?: number,
    depth?: number
): Observable<Array<Primitive>> {
    instance.getBoundingBox(box3Helper)
    const matrix = instance.matrix
        .clone()
        .multiply(makeTranslationMatrix(box3Helper.min.x, box3Helper.min.y, box3Helper.min.z))
    box3Helper.getSize(vectorHelper)
    const geometry = new PrismGeometry(width ?? vectorHelper.x, height ?? vectorHelper.y, depth ?? vectorHelper.z)
    return of([new GeometryPrimitive(matrix, geometry, instance.materialGenerator)])
}
