import { Canvas, events } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    applyInstance,
    Distributions,
    generateInitialPopulation,
    getDescriptionOfNoun,
    getLocalDescription,
    globalizeDescription,
    globalizeStep,
    HierarchicalInfo,
    HierarchicalPath,
    Instance,
    interprete,
    ParsedGrammarDefinition,
    ParsedSteps,
    procreatePopulation,
    toHierarchical,
    toValue,
} from "cgv"
import { Group, Texture } from "three"
import { domainContext, UseBaseStore, useBaseStore } from "../../global"
import { applyToObject3D, Primitive, operations } from "cgv/domains/shape"
import { of, Subscription } from "rxjs"
import { useViewerState } from "../../domains/shape/viewer/state"
import { point } from "../../domains/shape/viewer/description"
import { EditInfo } from "../../base-state"
import { freeze } from "immer"
import { RenderTexture, useContextBridge } from "@react-three/drei"
import { ViewerCamera } from "../../domains/shape/viewer/camera"
import { PanoramaView } from "../../domains/shape/viewer/panorama"
import { Tiles, BackgroundTile, useTilePositionScale } from "../../domains/shape/viewer/tile"
import { ViewControls } from "../../domains/shape/viewer/view-controls"
import { Background, Foreground, Panoramas, Skybox, tileDescriptionSuffix } from "../../domains/shape"

export function SelectInstanceDialog({
    fulfill,
    step,
    info,
    dependencies,
    distributions,
}: {
    fulfill: (value: any) => void
    step: ParsedSteps
    dependencies: ParsedGrammarDefinition
    distributions: Distributions
    info: EditInfo
}) {
    const [instances, setPopulation] = useState(() => generateInitialPopulation(distributions, 4))
    const store = useBaseStore()

    const [selected, setSelected] = useState<number | undefined>(undefined)
    const next = useCallback(() => {
        if (selected == null) {
            return
        }
        setPopulation(procreatePopulation(distributions, 4, instances[selected], 0.2))
    }, [instances, selected])
    const finish = useCallback(() => {
        if (selected == null) {
            return
        }
        const [stepInstance, dependencyInstances] = applyInstance(instances[selected], step, dependencies)
        store.getState().edit({
            ...info,
            stepGenerator: (path: HierarchicalPath) =>
                globalizeStep(stepInstance, getDescriptionOfNoun(path[0]), ...path),
            dependenciesGenerator: (descriptionName: string) =>
                toHierarchical(globalizeDescription(freeze(dependencyInstances), descriptionName)),
        })
        fulfill(null)
    }, [instances, step, info, selected])

    return (
        <div style={{ height: "90vh" }} className="d-flex flex-column">
            <div className="flex-grow-1 flex-basis-0 d-flex flex-row">
                <Preview
                    dependencies={dependencies}
                    className={`${
                        selected == 0 ? "border-primary" : "border-light"
                    } border-3 border flex-grow-1 flex-basis-0`}
                    info={info}
                    step={step}
                    onClick={() => setSelected(0)}
                    instance={instances[0]}
                />
                <Preview
                    dependencies={dependencies}
                    className={`${
                        selected == 1 ? "border-primary" : "border-light"
                    } border-3 border flex-grow-1 flex-basis-0`}
                    info={info}
                    step={step}
                    onClick={() => setSelected(1)}
                    instance={instances[1]}
                />
            </div>
            <div className="flex-grow-1 flex-basis-0 d-flex flex-row">
                <Preview
                    dependencies={dependencies}
                    className={`${
                        selected == 2 ? "border-primary" : "border-light"
                    } border-3 border flex-grow-1 flex-basis-0`}
                    info={info}
                    step={step}
                    onClick={() => setSelected(2)}
                    instance={instances[2]}
                />
                <Preview
                    dependencies={dependencies}
                    className={`${
                        selected == 3 ? "border-primary" : "border-light"
                    } border-3 border flex-grow-1 flex-basis-0`}
                    info={info}
                    step={step}
                    onClick={() => setSelected(3)}
                    instance={instances[3]}
                />
            </div>
            <div className="mt-3 d-flex justify-content-end align-items-center">
                <button disabled={selected == null} onClick={next} className="btn btn-primary me-3">
                    Next
                </button>
                <button disabled={selected == null} onClick={finish} className="btn btn-primary">
                    Finish
                </button>
            </div>
        </div>
    )
}

function Preview({
    instance,
    onClick,
    info,
    step,
    className,
    dependencies,
}: {
    step: ParsedSteps
    info: EditInfo
    instance: Instance
    dependencies: ParsedGrammarDefinition
    onClick: () => void
    className?: string
}) {
    const group = useMemo<Group>(() => new Group(), [])
    const store = useBaseStore()
    const Bridge = useContextBridge(domainContext)

    useEffect(() => interpretePreview(info, instance, dependencies, step, group, store), [instance])
    const [texture, setTexture] = useState<Texture>()

    const tileContent = useMemo(
        () => DescriptionTile.bind(null, group, store.getState().selectedDescriptions[0]),
        [group]
    )

    return (
        <Canvas
            style={{
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
            }}
            events={(store) => ({
                ...events(store),
                priority: 1,
                filter: (intersections) => {
                    if (useViewerState.getState().controlling) {
                        return []
                    }
                    return intersections.sort((a, b) => a.distance - b.distance)
                },
            })}
            dpr={global.window == null ? 1 : window.devicePixelRatio}
            onClick={(e) => {
                e.stopPropagation()
                onClick()
            }}
            className={className}>
            <Bridge>
                <RenderTexture ref={setTexture} attach="map" {...({} as any)}>
                    <ViewerCamera />
                    <PanoramaView />
                    <Skybox />
                    <Tiles tile={BackgroundTile} />
                </RenderTexture>
                <ViewControls />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 10]} intensity={0.5} />
                <Panoramas />
                <Tiles tile={tileContent} />
                <ViewerCamera>
                    {texture != null && <Background texture={texture} />}
                    {texture != null && <Foreground texture={texture} />}
                </ViewerCamera>
            </Bridge>
        </Canvas>
    )
}

function DescriptionTile(
    group: Group,
    descriptionName: string,
    { x, y, zoom }: { x: number; y: number; zoom: number }
) {
    const { position, scale } = useTilePositionScale(x, y, zoom)
    if (zoom != 18 || !descriptionName.endsWith(tileDescriptionSuffix(x, y))) {
        return null
    }

    group.scale.set(scale, scale, scale)
    group.position.set(...position)

    return <primitive object={group} />
}

function interpretePreview(
    info: EditInfo,
    instance: Instance,
    dependencies: ParsedGrammarDefinition,
    step: ParsedSteps,
    group: Group,
    store: UseBaseStore
): () => void {
    const [stepInstance, dependencyInstances] = applyInstance(instance, step, dependencies)

    const state = store.getState()
    const { seed, name } = state.descriptions.find((d) => d.name === state.selectedDescriptions[0])!
    const subscription = new Subscription()
    state
        .tryOut({
            ...info,
            stepGenerator: (path: HierarchicalPath) =>
                globalizeStep(stepInstance, getDescriptionOfNoun(path[0]), ...path),
            dependenciesGenerator: (descriptionName: string) =>
                toHierarchical(globalizeDescription(freeze(dependencyInstances), descriptionName)),
        })
        .then((grammar) => {
            const description = getLocalDescription(grammar, state.dependencyMap, name)
            subscription.add(
                applyToObject3D(
                    of(point).pipe(
                        toValue(),
                        interprete<Primitive, HierarchicalInfo>(description, operations, {
                            delay: state.interpretationDelay,
                            seed,
                        })
                    ),
                    group,
                    (value) => {
                        useViewerState.getState().setError(undefined)
                        return value.raw.getObject()
                    },
                    (error: any) => {
                        console.error(error)
                        useViewerState.getState().setError(error.message)
                    }
                )
            )
        })

    return () => {
        group.remove(...group.children)
        subscription.unsubscribe()
    }
}
