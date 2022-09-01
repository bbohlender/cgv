import { RenderTexture, Sphere, useContextBridge, Sky } from "@react-three/drei"

import { Canvas, events } from "@react-three/fiber"
import {
    convertLotsToSteps,
    convertRoadsToSteps,
    loadMapLayers,
    tileMeterRatio,
    tileZoomRatio,
} from "cgv/domains/shape"
import { HTMLProps, DragEvent, useState, useMemo } from "react"
import { ErrorMessage } from "../../../error-message"
import { domainContext, UseBaseStore, useBaseStore } from "../../../global"
import { panoramas } from "../global"
import { ViewerCamera } from "./camera"
import { getBackgroundOpacity, getForegroundOpacity, getPosition, useViewerState } from "./state"
import { ViewControls } from "./view-controls"
import { BackIcon } from "../../../icons/back"
import { MultiSelectIcon } from "../../../icons/multi-select"
import { DescriptionList } from "../../../gui/description-list"
import { GUI } from "../../../gui"
import { TextEditorToggle } from "../../../gui/toggles/text"
import { GeoSearch } from "../geo-search"
import { BackgroundTile, DescriptionTile, Tiles } from "./tile"
import { PanoramaView } from "./panorama"
import { getTileUrl } from "../available-tiles"
import { DownloadIcon } from "../../../icons/download"
import { Display } from "./display"
import {
    Texture,
} from "three"
import { VisualSelection } from "./visual-selection"
import Tooltip from "rc-tooltip"
import { CameraIcon } from "../../../icons/camera"

export function tileDescriptionSuffix(x: number, y: number): string {
    return `_${x}_${y}`
}

function onDrop(store: UseBaseStore, e: DragEvent<HTMLDivElement>) {
    e.stopPropagation()
    e.preventDefault()
    if (e.dataTransfer?.files.length === 1) {
        e.dataTransfer.files[0].text().then((text) => store.getState().import(text))
    }
}

export function Viewer({ className, children, ...rest }: HTMLProps<HTMLDivElement>) {
    const Bridge = useContextBridge(domainContext)
    const store = useBaseStore()
    const [texture, setTexture] = useState<Texture>()

    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop.bind(null, store)}
            {...rest}
            className={`${className} position-relative`}>
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
                dpr={global.window == null ? 1 : window.devicePixelRatio}>
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
                    <Tiles tile={DescriptionTile} />
                    <ViewerCamera>
                        {texture != null && <Background texture={texture} />}
                        {texture != null && <Foreground texture={texture} />}
                    </ViewerCamera>
                </Bridge>
            </Canvas>
            <div
                className="d-flex flex-row justify-content-between position-absolute"
                style={{
                    pointerEvents: "none",
                    inset: 0,
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                }}>
                <div className="d-flex flex-column my-3 ms-3" style={{ maxWidth: 200 }}>
                    <GeoSearch style={{ pointerEvents: "all" }} className="mb-3" />
                    <DescriptionList
                        createDescriptionRequestData={() => {
                            const [globalX, globalY, globalZ] = getPosition(useViewerState.getState())
                            const x = Math.floor(globalX * globalLocalRatio)
                            const y = Math.floor(globalZ * globalLocalRatio)
                            return { suffix: tileDescriptionSuffix(x, y) }
                        }}
                        style={{ pointerEvents: "all" }}
                        className="mb-3">
                        <div className="p-2 border-top border-1">
                            <div className="w-100 btn-sm btn btn-outline-secondary" onClick={() => generateLots(store)}>
                                Generate Lots
                            </div>
                            <div
                                className="w-100 btn-sm btn mt-2 btn-outline-secondary"
                                onClick={() => generateRoads(store)}>
                                Generate Roads
                            </div>
                            <SummarizeButton />
                        </div>
                    </DescriptionList>
                    <div className="flex-grow-1" />
                    <div style={{ pointerEvents: "all" }} className="d-flex flex-row">
                        <MultiSelectButton className="me-2" />
                        <VisualSelection className="me-2" />
                        <ExitStreetViewButton className="me-2" />
                        {/*<SpeedSelection className="me-2" />*/}
                        <DownloadButton className="me-2" />
                        <FlyCameraButton className="me-2" />
                        <ShowError />
                    </div>
                </div>
                <div className="d-flex flex-column align-items-end m-3">
                    <GUI
                        className="bg-light border rounded shadow w-100 mb-3 overflow-hidden"
                        style={{
                            maxWidth: "16rem",
                            pointerEvents: "all",
                        }}
                    />
                    <div className="flex-grow-1"></div>
                    <div className="d-flex flex-row" style={{ pointerEvents: "all" }}>
                        <TextEditorToggle className="me-2" />
                        {/*<FullscreenToggle rootRef={null} />*/}
                    </div>
                </div>
            </div>
            {children}
        </div>
    )
}

function SummarizeButton() {
    const store = useBaseStore()
    const enabled = store((state) => state.selectedDescriptions.length > 1)
    return (
        <div
            className={`w-100 btn-sm btn mt-2 btn-outline-secondary ${enabled ? "" : "disabled"}`}
            onClick={() => store.getState().request("summarize", undefined, store.getState().selectedDescriptions)}>
            Summarize
        </div>
    )
}

function Skybox() {
    const isInFlyCamera = useViewerState((state) => state.viewType === "fly")
    if (!isInFlyCamera) {
        return null
    }
    return (
        <Sky
            turbidity={10}
            rayleigh={0.4}
            mieCoefficient={0.001}
            mieDirectionalG={0.74}
            inclination={0.62}
            azimuth={0.13}
        />
    )
}

const fragmentShader = `
uniform sampler2D map;
uniform float opacity;
varying vec2 vUv;

vec4 fromLinear(vec4 linearRGB)
{
    bvec4 cutoff = lessThan(linearRGB, vec4(0.0031308));
    vec4 higher = vec4(1.055)*pow(linearRGB, vec4(1.0/2.4)) - vec4(0.055);
    vec4 lower = linearRGB * vec4(12.92);

    return mix(higher, lower, cutoff);
}

void main() {
    vec4 textureColor = texture2D( map, vUv );
    gl_FragColor = fromLinear(textureColor);
    gl_FragColor.a *= opacity;
}`
const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`

function Background({ texture }: { texture: Texture }) {
    const visualType = useViewerState((state) => state.visualType)
    const opacity = getBackgroundOpacity(visualType)
    const uniforms = useMemo(() => ({ map: { value: texture }, opacity: { value: 0 } }), [texture])
    uniforms.opacity.value = opacity
    return (
        <Display>
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                toneMapped={true}
                attach="material"
                depthTest={true}
                depthWrite={false}
                transparent
            />
        </Display>
    )
}

function Foreground({ texture }: { texture: Texture }) {
    const visualType = useViewerState((state) => state.visualType)
    const opacity = getForegroundOpacity(visualType)
    const uniforms = useMemo(() => ({ map: { value: texture }, opacity: { value: 0 } }), [texture])
    uniforms.opacity.value = opacity
    return (
        <Display renderOrder={2000}>
            <shaderMaterial
                uniforms={uniforms}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                toneMapped={true}
                attach="material"
                depthTest={false}
                opacity={opacity}
                depthWrite={false}
                transparent
            />
        </Display>
    )
}

const zoom = 18
const globalLocalRatio = tileZoomRatio(0, zoom)

async function generateLots(store: UseBaseStore) {
    const [globalX, , globalZ] = getPosition(useViewerState.getState())
    const x = Math.floor(globalX * globalLocalRatio)
    const y = Math.floor(globalZ * globalLocalRatio)
    const url = getTileUrl(zoom, x, y, "mvt")
    if (url == null) {
        return
    }
    const layers = await loadMapLayers(url, y, zoom)
    const extent = /**1 tile */ tileMeterRatio(y, zoom)
    const newDescriptions = convertLotsToSteps(layers, tileDescriptionSuffix(x, y), "exclude", extent)
    store.getState().addDescriptions(newDescriptions)
}

async function generateRoads(store: UseBaseStore) {
    const [globalX, , globalZ] = getPosition(useViewerState.getState())
    const x = Math.floor(globalX * globalLocalRatio)
    const y = Math.floor(globalZ * globalLocalRatio)
    const url = getTileUrl(zoom, x, y, "mvt")
    if (url == null) {
        return
    }
    const layers = await loadMapLayers(url, y, zoom)
    const extent = /**1 tile */ tileMeterRatio(y, zoom)
    const newDescriptions = convertRoadsToSteps(layers, tileDescriptionSuffix(x, y), "clip", extent)
    store.getState().addDescriptions(newDescriptions)
}

function ShowError() {
    const error = useViewerState((state) => state.error)
    if (error == null) {
        return null
    }
    return <ErrorMessage message={error} align="left" />
}

function Panoramas() {
    return (
        <>
            {panoramas.map(({ position }, index) => (
                <Sphere
                    key={index}
                    position={position}
                    onClick={(e) => {
                        e.stopPropagation()
                        useViewerState.getState().changePanoramaView(index)
                    }}
                    scale={0.00000003}>
                    <meshBasicMaterial color={0x0000ff} />
                </Sphere>
            ))}
        </>
    )
}

function DownloadButton({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()

    return (
        <Tooltip placement="top" overlay="Download">
            <div
                {...rest}
                onClick={() => store.getState().download()}
                className={`${className} d-flex align-items-center justify-content-center btn btn-primary btn-sm `}>
                <DownloadIcon />
            </div>
        </Tooltip>
    )
}

function FlyCameraButton({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const inFlyCamera = useViewerState(({ viewType }) => viewType === "fly")
    return (
        <Tooltip placement="top" overlay="Fly Camera">
            <div
                {...rest}
                onClick={() =>
                    inFlyCamera
                        ? useViewerState.getState().backToSateliteView()
                        : useViewerState.getState().enterFlyCamera()
                }
                className={`${className} d-flex align-items-center justify-content-center btn ${
                    inFlyCamera ? "btn-secondary" : "btn-primary"
                } btn-sm `}>
                <CameraIcon />
            </div>
        </Tooltip>
    )
}

function MultiSelectButton({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const store = useBaseStore()
    const shift = store((s) => (s.type === "gui" ? s.shift : false))
    return (
        <Tooltip placement="topLeft" overlay="Hold for multiselect">
            <div
                {...rest}
                onPointerDown={() => store.getState().setShift(true)}
                onPointerUp={() => store.getState().setShift(false)}
                className={`${className} d-flex align-items-center justify-content-center btn ${
                    shift ? "btn-primary" : "btn-secondary"
                } btn-sm `}>
                <MultiSelectIcon />
            </div>
        </Tooltip>
    )
}

function ExitStreetViewButton({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const viewType = useViewerState(({ viewType }) => viewType)
    if (viewType != "panorama") {
        return null
    }
    return (
        <Tooltip placement="top" overlay="Exit Street View">
            <div
                {...rest}
                className={`${className} d-flex align-items-center justify-content-center btn btn-sm btn-primary`}
                onClick={() => useViewerState.getState().backToSateliteView()}>
                <BackIcon />
            </div>
        </Tooltip>
    )
}
