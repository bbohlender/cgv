import React, { useMemo } from "react"
import ReactFlow, { ConnectionLineType, Node, Edge } from "react-flow-renderer"
import { createGraph } from "./create-graph"
import { useBaseGlobal, useBaseStore } from "../global"
import {
    getLocalDescription,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    SelectedSteps,
    shallowEqual,
} from "cgv"
import { GraphIcon } from "../icons/graph"
import { EditIcon } from "../icons/edit"
import { nodeTypes } from "./node-types"
import { BaseState } from "../base-state"

export function Graph() {
    const store = useBaseStore()
    const selectedDescription = store((state) => state.selectedDescription)
    const localDescription = store(
        (state) =>
            state.type === "gui" && state.graphVisualization && state.selectedDescription != null
                ? getLocalDescription(state.grammar, state.dependencyMap, state.selectedDescription)
                : undefined,
        shallowEqual
    )

    const { operationGuiMap } = useBaseGlobal()

    const [nodes, edges] = useMemo(() => {
        if (localDescription == null || selectedDescription == null) {
            return []
        }
        const newNodes: Array<Node> = []
        const newEdges: Array<Edge> = []
        createGraph(newNodes, newEdges, localDescription, selectedDescription, operationGuiMap)
        return [newNodes, newEdges]
    }, [localDescription, selectedDescription, operationGuiMap])

    if (selectedDescription == null) {
        return (
            <div className="d-flex align-items-center justify-content-center flex-grow-1">
                <span>Nothing Selected</span>
            </div>
        )
    }
    if (localDescription == null) {
        return null
    }

    return (
        <div className="position-relative flex-grow-1">
            <ReactFlow
                nodeTypes={nodeTypes}
                style={{ zIndex: 0 }}
                nodes={nodes}
                edges={edges}
                onNodeClick={(e, node: Node<{ value: HierarchicalParsedSteps | string }>) =>
                    store.getState().select(node.data.value, undefined, e.shiftKey ? "add" : "replace")
                }
                onNodeMouseEnter={(_, node: Node<{ value: HierarchicalParsedSteps | string }>) =>
                    store.getState().onStartHover(node.data.value, undefined)
                }
                onNodeMouseLeave={(_, node: Node<{ value: HierarchicalParsedSteps | string }>) =>
                    store.getState().onEndHover(node.data.value)
                }
                connectionLineType={ConnectionLineType.SmoothStep}
            />
            <div
                style={{ position: "fixed", right: "1rem", bottom: "1rem" }}
                className="d-flex flex-row align-items-center">
                <button
                    className="d-flex align-items-center btn btn-sm btn-primary me-2"
                    onClick={() => store.getState().setGraphVisualization(false)}>
                    <GraphIcon />
                </button>
                <button
                    className="d-flex align-items-center btn btn-sm btn-secondary"
                    onClick={() => store.getState().setType("tui")}>
                    <EditIcon />
                </button>
            </div>
        </div>
    )
}
