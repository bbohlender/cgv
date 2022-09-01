import { lastValueFrom, map, of, tap } from "rxjs"
import {
    ChangeType,
    interprete,
    InterpreterOptions,
    Operations,
    ParsedGrammarDefinition,
    ParsedSteps,
    toValue,
    Value,
    valuesToChanges,
} from "../.."
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter"
import { BoxGeometry, Mesh, MeshBasicMaterial, MeshLambertMaterial, Object3D, Scene } from "three"
import { Primitive } from "."

const exporter = new GLTFExporter()

export async function toGltf(
    baseValue: Primitive,
    grammar: ParsedGrammarDefinition,
    operations: Operations<Primitive>,
    options: InterpreterOptions<Primitive, any>,
    toObject: (value: Value<Primitive>) => Object3D,
    onError: (error: any) => void
): Promise<any> {
    const scene = new Scene()
    const root = new Object3D()
    scene.add(root)
    const map = new Map<string, Object3D>()
    await lastValueFrom(
        of(baseValue).pipe(
            toValue(),
            interprete(grammar, operations, options),
            valuesToChanges(),
            tap({
                next: (change) => {
                    const key = change.index.join(",")
                    if (change.type === ChangeType.SET) {
                        const child = toObject(change.value)
                        root.add(child)
                        map.set(key, child)
                    } else {
                        const child = map.get(key)
                        if (child != null) {
                            map.delete(key)
                            scene.remove(child)
                        }
                    }
                },
                error: (error) => {
                    onError(error)
                },
            })
        )
    )
    scene.updateMatrixWorld()
    const gltf = await new Promise<any>((resolve, reject) =>
        (exporter as any).parse(root, resolve, reject, {
            forceIndices: true,
            binary: true,
        })
    )
    return gltf
}
