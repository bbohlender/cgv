import { parse, ParsedSteps } from "cgv"
import create from "zustand"
import { combine } from "zustand/middleware"
import { Grammar } from "../src/grammar"
import { GUI } from "../src/gui"

const testGrammar = parse(`Start -> face(
	point(100,0,900),
	point(-300,0,0),
	point(800,0,100),
	point(600,0,600)
) Lot

Lot -> color(0x333343) extrude(600) toFaces() (select(0, 4) Wall | select(4, 5) Roof)

Wall -> splitZ(200) Floor

Roof -> color(0x8881111)

Floor -> splitX(200) WindowFrame

WindowFrame -> if (size("x") >= 200)
	then (
		multiSplitX(50, 100) switch index()
			case 0: this
			case 1: (
				multiSplitZ(50, 100) switch index()
					case 0: this
					case 1: Window
					case 2: this
			)
			case 2: this
	)
	else this

Window -> color(0xEEEEEE)`)

export type State = { selected: ParsedSteps | undefined; hovered: Array<ParsedSteps> }

const initialState: State = {
    selected: undefined,
    hovered: [],
}

const store = combine(initialState, (set, get) => ({
    onStartHover: (step: ParsedSteps) => {
        const hovered = get().hovered
        if (!hovered.includes(step)) {
            set({ hovered: [...hovered, step] })
        }
    },
    onEndHover: (step: ParsedSteps) => set({ hovered: get().hovered.filter((hoveredStep) => hoveredStep != step) }),
    select: (step: ParsedSteps) => set({ selected: step }),
    unselect: () => set({ selected: undefined }),
}))

export const useStore = create(store)

export default function Editor() {
    return (
        <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
            <div className="flex-basis-0 flex-grow-1 position-relative">
                <GUI style={{ top: "1rem", right: "1rem" }} />
            </div>
            <div
                style={{ overflowX: "hidden", overflowY: "auto" }}
                className="text-editor p-3 text-light flex-basis-0 flex-grow-1 bg-dark">
                <Grammar value={testGrammar} />
            </div>
        </div>
    )
}
