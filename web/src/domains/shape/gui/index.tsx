import { OperationGUIMap } from "../../../gui"
import { GUIColorStep } from "./color"
import { GUIExtrudeStep } from "./extrude"
import { GUIFaceSteps } from "./face"
import { GUILineStep } from "./line"
import { GUIMultiSplitSteps } from "./multi-split"
import { GUIPointStep } from "./point"
import { GUIRotateStep } from "./rotate"
import { GUIScaleStep } from "./scale"
import { GUISizeStep } from "./size"
import { GUISplitSteps } from "./split"
import { GUITranslateStep } from "./translate"

const emptyStep = () => null

export const operationGuiMap: OperationGUIMap = {
    color: GUIColorStep,
    point: GUIPointStep,
    line: GUILineStep,
    face: GUIFaceSteps,
    extrude: GUIExtrudeStep,
    rotate: GUIRotateStep,
    translate: GUITranslateStep,
    scale: GUIScaleStep,
    size: GUISizeStep,
    toFaces: emptyStep,
    toLines: emptyStep,
    toPoints: emptyStep,
    split: GUISplitSteps,
    multiSplit: GUIMultiSplitSteps,
}
