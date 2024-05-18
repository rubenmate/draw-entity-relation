import * as React from "react";
import "./styles/diagramEditor.css";
import { default as MxGraph } from "mxgraph";
import { mxConstants } from "mxgraph-js";
import { CompactPicker } from "react-color";
import toast, { Toaster } from "react-hot-toast";
import {
    configureKeyBindings,
    getStyleByKey,
    setInitialConfiguration,
} from "./utils";

const { mxGraph, mxEvent } = MxGraph();

export default function App(props) {
    const containerRef = React.useRef(null);
    const toolbarRef = React.useRef(null);

    const [graph, setGraph] = React.useState(null);
    const [selected, setSelected] = React.useState(null);

    const [showPrimaryButton, setShowPrimaryButton] = React.useState(false);
    const [colorPickerVisible, setColorPickerVisible] = React.useState(false);
    const [colorPickerType, setColorPickerType] = React.useState(null);

    // Define event handlers using useCallback to stabilize their identities
    const onChange = React.useCallback(
        (evt) => {
            if (props.onChange) {
                props.onChange(evt);
            }
        },
        [props],
    );

    const onSelected = React.useCallback(
        (evt) => {
            if (props.onSelected) {
                props.onSelected(evt);
            }
            setSelected(evt.cells[0]);
            setColorPickerVisible(false);
        },
        [props],
    );

    const onElementAdd = React.useCallback(
        (evt) => {
            if (props.onElementAdd) {
                props.onElementAdd(evt);
            }
        },
        [props],
    );

    const onDragEnd = React.useCallback(
        (evt) => {
            if (props.onDragEnd) {
                props.onDragEnd(evt);
            }
        },
        [props],
    );

    React.useEffect(() => {
        if (!graph) {
            mxEvent.disableContextMenu(containerRef.current);
            setGraph(new mxGraph(containerRef.current));
        }
        if (graph) {
            console.log(graph);
            setInitialConfiguration(graph, toolbarRef);
            configureKeyBindings(graph);

            graph.getModel().endUpdate();
            graph.getModel().addListener(mxEvent.CHANGE, onChange);
            graph.getSelectionModel().addListener(mxEvent.CHANGE, onSelected);
            graph.getModel().addListener(mxEvent.ADD, onElementAdd);
            graph.getModel().addListener(mxEvent.MOVE_END, onDragEnd);
        }
    }, [graph, onChange, onSelected, onElementAdd, onDragEnd]);

    // TODO: Remove this useEffect since it's just for debugging
    React.useEffect(() => {
        if (graph) {
            console.log(graph.model.cells);
            console.log(selected);
        }
    });

    const updateCellColor = (type, color) => {
        graph.setCellStyles(type, color.hex);
    };

    const pushCellsBack = (moveBack) => () => {
        graph.orderCells(moveBack);
    };

    const renderMoveBackAndFrontButtons = () =>
        selected && (
            <React.Fragment>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={pushCellsBack(true)}
                >
                    Move back
                </button>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={pushCellsBack(false)}
                >
                    Move front
                </button>
            </React.Fragment>
        );

    const renderColorChange = (type, content) => {
        if (!selected) {
            return null;
        }
        return (
            <button
                type="button"
                className={"button-toolbar-action"}
                onClick={() => {
                    setColorPickerVisible(!colorPickerVisible);
                    setColorPickerType(type);
                }}
                style={{
                    backgroundColor:
                        selected.style && getStyleByKey(selected.style, type),
                }}
            >
                {content}
            </button>
        );
    };

    const renderColorPicker = () =>
        colorPickerVisible &&
        selected && (
            <div>
                <div className="toolbar-separator" />
                <CompactPicker
                    color={
                        selected.style &&
                        getStyleByKey(selected.style, "fillColor")
                    }
                    onChange={(color) => {
                        updateCellColor(colorPickerType, color);
                    }}
                />
            </div>
        );

    const renderAddAttribute = () => {
        if (selected?.style.includes(";shape=rectangle") && showPrimaryButton) {
            return (
                <>
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={() => addAttribute(true)}
                    >
                        Añadir atributo primario
                    </button>
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={() => addAttribute(false)}
                    >
                        Añadir atributo
                    </button>
                </>
            );
        }
        if (selected?.style.includes(";shape=rectangle")) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={() => setShowPrimaryButton(true)}
                >
                    Añadir atributo
                </button>
            );
        }
    };

    const addAttribute = (primary) => {
        if (selected.style.includes(";shape=rectangle")) {
            const color = primary ? "yellow" : "blue";
            const source = selected;

            const newX = selected.geometry.x + 120;
            const newY = selected.geometry.y;

            // Define a style with labelPosition set to ALIGN_RIGHT, additional right spacing
            const style = {};
            style[mxConstants.STYLE_LABEL_POSITION] = mxConstants.ALIGN_RIGHT;
            style[mxConstants.STYLE_SPACING_RIGHT] = -40; // Adjust this value to control the extra space to the right

            // Apply the style to the vertex
            graph.getStylesheet().putCellStyle("rightLabelStyle", style);

            const target = graph.insertVertex(
                null,
                null,
                "Atributo", // Placeholder attribute
                newX,
                newY,
                10,
                10,
                `shape=ellipse;rightLabelStyle;fillColor=${color}`,
            );
            graph.insertEdge(selected, null, null, source, target);
            graph.orderCells(false); // Move front the selected entity so the new vertex aren't on top

            setShowPrimaryButton(false); // After adding go back to show the normal button

            // TODO: Instead of toasting here set a listener that toast every time a cell is added
            toast.success("Atributo insertado");
            // TODO: Increment the offset so that new attributes are not added on top of others
        }
    };

    return (
        <div className="mxgraph-container">
            <div className="mxgraph-toolbar-container">
                <div className="mxgraph-toolbar-container" ref={toolbarRef} />
                <div>
                    {renderAddAttribute()}
                    {renderMoveBackAndFrontButtons()}
                    {renderColorChange("fillColor", "Change fill color")}
                    {renderColorChange("fontColor", "Change font color")}
                    {renderColorChange("strokeColor", "Change border color")}
                </div>
                {renderColorPicker()}
            </div>
            <div ref={containerRef} className="mxgraph-drawing-container" />
            <Toaster position="bottom-left" />
        </div>
    );
}
