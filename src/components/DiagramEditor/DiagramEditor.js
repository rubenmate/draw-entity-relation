import * as React from "react";
import "./styles/diagramEditor.css";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
} from "@mui/material";
import { default as MxGraph } from "mxgraph";
import { mxConstants, mxPoint } from "mxgraph-js";
import toast, { Toaster } from "react-hot-toast";
import { POSSIBLE_CARDINALITIES, validateGraph } from "../../utils/validation";
import { configureKeyBindings, setInitialConfiguration } from "./utils";

const { mxGraph, mxEvent } = MxGraph();

export default function App(props) {
    // Define a style with labelPosition set to ALIGN_RIGHT, additional right spacing
    const rightLabelStyle = {};
    rightLabelStyle[mxConstants.STYLE_LABEL_POSITION] = mxConstants.ALIGN_RIGHT;
    rightLabelStyle[mxConstants.STYLE_SPACING_RIGHT] = -40; // Adjust this value to control the extra space to the right
    // Apply font underline to the key attribute label text
    const keyAttrStyle = {};
    keyAttrStyle[mxConstants.STYLE_FONTSTYLE] = mxConstants.FONT_UNDERLINE;
    // TODO: Define a style that makes an edge non reassignable

    // Define a style that makes a cell non-resizable and non-movable
    const notResizeableStyle = {};
    notResizeableStyle[mxConstants.STYLE_RESIZABLE] = 0; // Makes the cell non-resizable
    //
    const transparentColor = {};
    transparentColor[mxConstants.STYLE_FILLCOLOR] = "transparent";

    const containerRef = React.useRef(null);
    const toolbarRef = React.useRef(null);

    const [graph, setGraph] = React.useState(null);
    const diagramRef = React.useRef({
        entities: [],
        relations: [],
    });
    const [selected, setSelected] = React.useState(null);
    const [entityWithAttributesHidden, setEntityWithAttributesHidden] =
        React.useState(null);

    const [refreshDiagram, setRefreshDiagram] = React.useState(false);
    const addPrimaryAttrRef = React.useRef(null);

    const onSelected = React.useCallback(
        (evt) => {
            if (props.onSelected) {
                props.onSelected(evt);
            }
            setSelected(evt.cells[0]);
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

    function accessCell(idMx) {
        return graph.model.cells[idMx];
    }

    React.useEffect(() => {
        if (!graph) {
            mxEvent.disableContextMenu(containerRef.current);
            setGraph(new mxGraph(containerRef.current));
        }
        if (graph) {
            setInitialConfiguration(graph, diagramRef, toolbarRef);
            configureKeyBindings(graph);

            graph.getModel().endUpdate();
            graph.getSelectionModel().addListener(mxEvent.CHANGE, onSelected);
            graph.getModel().addListener(mxEvent.ADD, onElementAdd);
            graph.getModel().addListener(mxEvent.MOVE_END, onDragEnd);

            graph.stylesheet.styles.defaultEdge.endArrow = ""; // NOTE: Edges are not directed
            graph
                .getStylesheet()
                .putCellStyle("rightLabelStyle", rightLabelStyle);

            graph.getStylesheet().putCellStyle("keyAttrStyle", keyAttrStyle);
            graph
                .getStylesheet()
                .putCellStyle("notResizeableStyle", notResizeableStyle);
            graph
                .getStylesheet()
                .putCellStyle("transparentColor", transparentColor);
            // Cleanup function to remove the listener
            return () => {
                graph.getModel().removeListener(mxEvent.ADD, onSelected);
                graph.getModel().removeListener(mxEvent.MOVE_END, onElementAdd);
                graph.getModel().removeListener(mxEvent.CHANGE, onSelected);
            };
        }
    }, [graph, onSelected, onElementAdd, onDragEnd]);

    const updateEntityAttributes = (entity) => {
        if (entity.attributes) {
            entity.attributes.forEach((attr) => {
                if (graph.model.cells.hasOwnProperty(attr.idMx)) {
                    const cellDataAttr = accessCell(attr.idMx);
                    const numEdgeIdMx = +attr.idMx + 1;
                    const cellEdgeAttr = accessCell(numEdgeIdMx);

                    attr.name = cellDataAttr.value;
                    attr.position.x = cellDataAttr.geometry.x;
                    attr.position.y = cellDataAttr.geometry.y;
                    attr.cell = [cellDataAttr.id, cellEdgeAttr.id];
                }
            });
        }
    };

    const updateDiagramData = () => {
        diagramRef.current.entities.forEach((entity) => {
            if (graph.model.cells.hasOwnProperty(entity.idMx)) {
                const cellData = accessCell(entity.idMx);

                entity.name = cellData.value;
                entity.position.x = cellData.geometry.x;
                entity.position.y = cellData.geometry.y;

                updateEntityAttributes(entity);
            }
        });

        diagramRef.current.relations.forEach((relation) => {
            if (graph.model.cells.hasOwnProperty(relation.idMx)) {
                const cellData = accessCell(relation.idMx);

                relation.name = cellData.value;
                relation.position.x = cellData.geometry.x;
                relation.position.y = cellData.geometry.y;

                updateEntityAttributes(relation);
            }
        });
    };

    React.useEffect(() => {
        if (graph) {
            console.log("Graph", diagramRef.current);
            console.log("Cells", graph.model.cells);
            // FIX: The validation happens on the next render
            console.log("Validation result", validateGraph(diagramRef.current));

            updateDiagramData();
        }
    }, [graph, selected, refreshDiagram, diagramRef]);

    const pushCellsBack = (moveBack) => () => {
        graph.orderCells(moveBack);
    };

    const addAttribute = () => {
        let selectedDiag;
        let isRelation = false;
        if (selected?.style?.includes("shape=rectangle")) {
            selectedDiag = diagramRef.current.entities.find(
                (entity) => entity.idMx === selected.id,
            );
        } else if (selected?.style?.includes("shape=rhombus")) {
            selectedDiag = diagramRef.current.relations.find(
                (relation) => relation.idMx === selected.id,
            );
            isRelation = true;
        }
        const addKey = selectedDiag?.attributes?.length === 0;
        addPrimaryAttrRef.current = addKey;
        const source = selected;

        const newX = selected.geometry.x + 120;
        const newY = selected.geometry.y;

        // Function to generate a unique attribute name
        const generateUniqueAttributeName = (baseName, existingAttributes) => {
            let counter = 0;
            let uniqueName = baseName;

            const nameExists = (name) => {
                return existingAttributes.some((attr) => attr.name === name);
            };

            while (nameExists(uniqueName)) {
                counter++;
                uniqueName = `${baseName} ${counter}`;
            }

            return uniqueName;
        };

        const baseAttributeName = "Atributo";
        const existingAttributes = selectedDiag.attributes || [];
        const uniqueAttributeName = generateUniqueAttributeName(
            baseAttributeName,
            existingAttributes,
        );

        const target = graph.insertVertex(
            null,
            null,
            uniqueAttributeName, // Unique attribute name as placeholder
            newX,
            newY,
            10,
            10,
            `shape=ellipse;rightLabelStyle;notResizeableStyle;transparentColor;${
                addPrimaryAttrRef.current && !isRelation ? "keyAttrStyle" : ""
            }`,
        );

        // TODO: Protect attributes edges to be reassigned
        // graph.addListener(mxEvent.CONNECT, function (sender, evt) {
        //     var connection = evt.getProperty("connection");
        //     var source = connection.getSource();
        //     var target = connection.getTarget();
        //
        //     // Check if the source and target are the ones you want to lock
        //     if (source === lockedSource || target === lockedTarget) {
        //         // Prevent the connection
        //         evt.consume();
        //     }
        // });

        graph.insertEdge(selected, null, null, source, target);
        graph.orderCells(false); // Move front the selected entity so the new vertex aren't on top

        if (!isRelation) {
            // Update diagram state
            diagramRef.current.entities
                .find((entity) => entity.idMx === selected.id)
                .attributes.push({
                    idMx: target.id,
                    name: target.value,
                    position: {
                        x: target.geometry.x,
                        y: target.geometry.y,
                    },
                    key: addPrimaryAttrRef.current,
                    cell: [target.id, String(+target.id + 1)],
                });
        } else if (isRelation) {
            // Update diagram state
            diagramRef.current.relations
                .find((relation) => relation.idMx === selected.id)
                .attributes.push({
                    idMx: target.id,
                    name: target.value,
                    position: {
                        x: target.geometry.x,
                        y: target.geometry.y,
                    },
                    cell: [target.id, String(+target.id + 1)],
                });
        }
        toast.success("Atributo insertado");
        // TODO: Increment the offset so that new attributes are not added on top of others
    };

    const hideAttributes = (isRelationNM) => {
        const selectedEntity = !isRelationNM
            ? diagramRef.current.entities.find(
                  ({ idMx }) => idMx === selected.id,
              )
            : diagramRef.current.relations.find(
                  ({ idMx }) => idMx === selected.id,
              );
        selectedEntity.attributes.forEach(({ cell }) => {
            accessCell(cell.at(0)).setVisible(false);
            accessCell(cell.at(1)).setVisible(false);
        });
        // graph.removeCells(mxAttributesToRemove);
        // NOTE: Refresh the graph to visually update the cell values
        const graphView = graph.getDefaultParent();
        const view = graph.getView(graphView);
        view.refresh();

        const updatedAttributesHidden = { ...entityWithAttributesHidden };
        updatedAttributesHidden[selected.id] = true;
        setEntityWithAttributesHidden(updatedAttributesHidden);
    };

    const showAttributes = (isRelationNM) => {
        const selectedEntity = !isRelationNM
            ? diagramRef.current.entities.find(
                  ({ idMx }) => idMx === selected.id,
              )
            : diagramRef.current.relations.find(
                  ({ idMx }) => idMx === selected.id,
              );
        selectedEntity.attributes.forEach(({ cell }) => {
            accessCell(cell.at(0)).setVisible(true);
            accessCell(cell.at(1)).setVisible(true);
        });
        // NOTE: Refresh the graph to visually update the cell values
        const graphView = graph.getDefaultParent();
        const view = graph.getView(graphView);
        view.refresh();

        const updatedAttributesHidden = { ...entityWithAttributesHidden };
        updatedAttributesHidden[selected.id] = false;
        setEntityWithAttributesHidden(updatedAttributesHidden);
    };

    const toggleAttrKey = () => {
        let entityIndexToUpdate;
        const cellsToDelete = [];
        const cellsToRecreate = [];

        diagramRef.current.entities.find((entity, index) => {
            entity.attributes.forEach((attribute) => {
                if (attribute.idMx === selected.id) {
                    entityIndexToUpdate = index;
                    return true;
                }
            });
        });

        diagramRef.current.entities
            .at(entityIndexToUpdate)
            .attributes.forEach((attribute) => {
                // TODO: Instead of deleting and adding the cells update
                // it to use the Refresh canvas (there is a note in this file)
                cellsToDelete.push(accessCell(attribute.cell.at(0)));
                cellsToDelete.push(accessCell(attribute.cell.at(1)));
                const originalString = accessCell(attribute.cell.at(0)).style;
                if (attribute.idMx === selected.id) {
                    attribute.key = true;
                    attribute.value = "Clave";
                    const modifiedString = `${originalString}keyAttrStyle`;
                    accessCell(attribute.cell.at(0)).style = modifiedString;
                } else {
                    attribute.key = false;
                    const stringWithoutKeyAttrStyle = originalString.replace(
                        /keyAttrStyle(;|$)/,
                        "",
                    );
                    accessCell(attribute.cell.at(0)).style =
                        stringWithoutKeyAttrStyle;
                }
                cellsToRecreate.push(accessCell(attribute.cell.at(0)));
                cellsToRecreate.push(accessCell(attribute.cell.at(1)));
            });

        // FIX: Removing the cells and then adding may not work
        // The easiest way to change the style it's to modify it and then
        // remove the old cells and create the modified ones
        graph.removeCells(cellsToDelete);
        graph.addCells(cellsToRecreate);
        graph.orderCells(true, cellsToRecreate);

        // This triggers a rerender
        setRefreshDiagram((prevState) => !prevState);
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

    const renderAddAttribute = () => {
        if (selected?.style?.includes("shape=rectangle")) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={addAttribute}
                >
                    Añadir atributo
                </button>
            );
        }
    };

    const renderRelationAddAttribute = () => {
        if (
            selected?.style?.includes("shape=rhombus") &&
            diagramRef.current.relations.find(
                (entity) => entity.idMx === selected?.id,
            )?.canHoldAttributes
        ) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={addAttribute}
                >
                    Añadir atributo
                </button>
            );
        }
    };

    const renderToggleAttributes = () => {
        const isEntity = selected?.style?.includes("shape=rectangle");
        const isRelationNM =
            selected?.style?.includes("shape=rhombus") &&
            diagramRef.current.relations.find(
                (entity) => entity.idMx === selected?.id,
            )?.canHoldAttributes;

        if (isEntity || isRelationNM) {
            if (
                entityWithAttributesHidden &&
                !entityWithAttributesHidden.hasOwnProperty(selected.id)
            ) {
                const updatedAttributesHidden = {
                    ...entityWithAttributesHidden,
                };
                updatedAttributesHidden[selected.id] = false;
                setEntityWithAttributesHidden(updatedAttributesHidden);
            }
            const attributesHidden = entityWithAttributesHidden?.[selected.id];

            if (attributesHidden !== true) {
                return (
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={() => hideAttributes(isRelationNM)}
                    >
                        Ocultar atributos
                    </button>
                );
            }
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={() => showAttributes(isRelationNM)}
                >
                    Mostrar atributos
                </button>
            );
        }
    };

    const renderToggleAttrKey = () => {
        const isAttribute = selected?.style?.includes("shape=ellipse");
        let isKey;
        let isFromRelation = false;

        for (const entity of diagramRef.current.entities) {
            for (const attribute of entity.attributes) {
                if (attribute.idMx === selected?.id) {
                    isKey = attribute.key;
                    break; // Exit the inner loop once the matching attribute is found
                }
            }

            if (isKey !== undefined) {
                break; // Exit the outer loop once the matching attribute is found
            }
        }

        for (const relation of diagramRef.current.relations) {
            for (const attribute of relation.attributes) {
                if (attribute.idMx === selected?.id) {
                    isFromRelation = true;
                    break;
                }
            }
        }

        if (isAttribute && !isKey && !isFromRelation) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={toggleAttrKey}
                >
                    Convertir en clave
                </button>
            );
        }
    };

    // TODO: This component is highly refactorizable
    const renderRelationConfiguration = () => {
        const isRelation = selected?.style?.includes("shape=rhombus");
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            // TODO: Si la relación ya está configurada debe mostrarse un toast de error indicando
            // que ya existe una relación entre estas dos entidades
            const source = selected;

            const target1 = accessCell(side1.idMx);
            const target2 = accessCell(side2.idMx);

            // TODO: Proteger estos edges contra escritura de labels y borrado
            const edge1 = graph.insertEdge(
                selected,
                null,
                null,
                source,
                target1,
            );
            const edge2 = graph.insertEdge(
                selected,
                null,
                null,
                source,
                target2,
            );
            const cardinality1 = graph.insertVertex(
                edge1,
                null,
                "X:X",
                0,
                0,
                1,
                1,
                "fontSize=12;fontColor=#000000;fillColor=#ffffff;strokeColor=none;rounded=1;arcSize=25;strokeWidth=3;",
                true,
            );
            const cardinality2 = graph.insertVertex(
                edge2,
                null,
                "X:X",
                0,
                0,
                1,
                1,
                "fontSize=12;fontColor=#000000;fillColor=#ffffff;strokeColor=none;rounded=1;arcSize=25;strokeWidth=3;",
                true,
            );
            graph.updateCellSize(cardinality1);
            graph.updateCellSize(cardinality2);

            const selectedDiag = diagramRef.current.relations.find(
                (entity) => entity.idMx === selected?.id,
            );
            selectedDiag.side1.idMx = cardinality1.id;
            selectedDiag.side2.idMx = cardinality2.id;

            selectedDiag.side1.cell = cardinality1.id;
            selectedDiag.side2.cell = cardinality2.id;
            selectedDiag.side1.entity.idMx = side1.idMx;
            selectedDiag.side2.entity.idMx = side2.idMx;

            if (target1 === target2) {
                const x1 = target1.geometry.x + target1.geometry.width / 2;
                const x2 = source.geometry.x + source.geometry.width / 2;
                const y1 = target1.geometry.y + target1.geometry.height / 2;
                const y2 = source.geometry.y + source.geometry.height / 2;

                edge1.geometry.points = [new mxPoint(x2, y1)];
                edge2.geometry.points = [new mxPoint(x1, y2)];
            }
            graph.orderCells(true, [edge1, edge2]); // Move the new edges to the back

            setOpen(false);
        };

        const [side1, setSide1] = React.useState("");
        const [side2, setSide2] = React.useState("");

        const handleChangeSide1 = (event) => {
            setSide1(event.target.value);
        };
        const handleChangeSide2 = (event) => {
            setSide2(event.target.value);
        };

        React.useEffect(() => {
            if (side1 !== "" && side2 !== "") {
                setAcceptDisabled(false);
            }
        }, [side1, side2]);

        if (isRelation) {
            return (
                <>
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={handleClickOpen}
                    >
                        Configurar relación
                    </button>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            {"Configurar relación"}
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                Escoger los lados de esta relación
                            </DialogContentText>
                            <Box sx={{ minHeight: 10 }} />
                            <Box sx={{ minWidth: 120 }}>
                                <FormControl fullWidth>
                                    <InputLabel id="side1-label">
                                        Lado 1
                                    </InputLabel>
                                    <Select
                                        id="side1"
                                        value={side1}
                                        label="Age"
                                        onChange={handleChangeSide1}
                                    >
                                        {diagramRef.current.entities.map(
                                            (entity) => {
                                                return (
                                                    <MenuItem
                                                        key={entity.idMx}
                                                        value={entity}
                                                    >
                                                        {entity.name}
                                                    </MenuItem>
                                                );
                                            },
                                        )}
                                    </Select>
                                </FormControl>
                                <Box sx={{ minHeight: 10 }} />
                                <FormControl fullWidth>
                                    <InputLabel id="side2-label">
                                        Lado 2
                                    </InputLabel>
                                    <Select
                                        id="side2"
                                        value={side2}
                                        label="Lado 2"
                                        onChange={handleChangeSide2}
                                    >
                                        {diagramRef.current.entities.map(
                                            (entity) => {
                                                return (
                                                    <MenuItem
                                                        key={entity.idMx}
                                                        value={entity}
                                                    >
                                                        {entity.name}
                                                    </MenuItem>
                                                );
                                            },
                                        )}
                                    </Select>
                                </FormControl>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleClose}>Cancelar</Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                Aceptar
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
    };

    const renderRelationCardinalities = () => {
        const isRelation = selected?.style?.includes("shape=rhombus");
        const selectedDiag = diagramRef.current.relations.find(
            (entity) => entity.idMx === selected?.id,
        );
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            selectedDiag.side1.cardinality = side1;
            selectedDiag.side2.cardinality = side2;

            if (side1 === "1:N" && side2 === "1:N") {
                selectedDiag.canHoldAttributes = true;
            }

            const label1 = accessCell(selectedDiag.side1.cell);
            const label2 = accessCell(selectedDiag.side2.cell);

            graph.model.setValue(label1, side1);
            graph.model.setValue(label2, side2);
            // NOTE: Refresh the graph to visually update the cell values
            const graphView = graph.getDefaultParent();
            const view = graph.getView(graphView);
            view.refresh();

            setOpen(false);
        };

        const [side1, setSide1] = React.useState("");
        const [side2, setSide2] = React.useState("");

        const handleChangeSide1 = (event) => {
            setSide1(event.target.value);
        };
        const handleChangeSide2 = (event) => {
            setSide2(event.target.value);
        };

        React.useEffect(() => {
            if (side1 !== "" && side2 !== "") {
                setAcceptDisabled(false);
            }
        }, [side1, side2]);

        if (isRelation) {
            const isConfigured =
                selectedDiag?.side1.idMx !== "" &&
                selectedDiag?.side2.idMx !== "";
            return (
                <>
                    <button
                        type="button"
                        className="button-toolbar-action"
                        onClick={handleClickOpen}
                    >
                        Configurar cardinalidades
                    </button>
                    <Dialog
                        open={open}
                        onClose={handleClose}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            {"Configurar cardinalidades"}
                        </DialogTitle>
                        {!isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    Esta relación todavía no está configurada
                                </DialogContentText>
                            </DialogContent>
                        )}
                        {isConfigured && (
                            <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                    Escoger los lados de esta relación
                                </DialogContentText>
                                <Box sx={{ minHeight: 10 }} />
                                <Box sx={{ minWidth: 120 }}>
                                    <FormControl fullWidth>
                                        <InputLabel id="side1-to-side2-label">
                                            {`${
                                                accessCell(
                                                    selectedDiag?.side1?.entity
                                                        ?.idMx,
                                                )?.value
                                            } - ${
                                                accessCell(
                                                    selectedDiag?.side2?.entity
                                                        ?.idMx,
                                                )?.value
                                            }`}
                                        </InputLabel>
                                        <Select
                                            id="side1-to-side2"
                                            value={side1}
                                            label="Cardinalidad 1"
                                            onChange={handleChangeSide1}
                                        >
                                            {POSSIBLE_CARDINALITIES.map(
                                                (cardinality) => {
                                                    return (
                                                        <MenuItem
                                                            key={cardinality}
                                                            value={cardinality}
                                                        >
                                                            {cardinality}
                                                        </MenuItem>
                                                    );
                                                },
                                            )}
                                        </Select>
                                    </FormControl>
                                    <Box sx={{ minHeight: 10 }} />
                                    <FormControl fullWidth>
                                        <InputLabel id="side2-to-side1-label">
                                            {`${
                                                accessCell(
                                                    selectedDiag?.side2?.entity
                                                        ?.idMx,
                                                )?.value
                                            } - ${
                                                accessCell(
                                                    selectedDiag?.side1?.entity
                                                        ?.idMx,
                                                )?.value
                                            }`}
                                        </InputLabel>
                                        <Select
                                            id="side2-to-side1"
                                            value={side2}
                                            label="Cardinalidad 2"
                                            onChange={handleChangeSide2}
                                        >
                                            {POSSIBLE_CARDINALITIES.map(
                                                (cardinality) => {
                                                    return (
                                                        <MenuItem
                                                            key={cardinality}
                                                            value={cardinality}
                                                        >
                                                            {cardinality}
                                                        </MenuItem>
                                                    );
                                                },
                                            )}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </DialogContent>
                        )}
                        <DialogActions>
                            <Button onClick={handleClose}>Cancelar</Button>
                            <Button
                                onClick={handleAccept}
                                autoFocus
                                disabled={acceptDisabled}
                            >
                                Aceptar
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            );
        }
    };

    return (
        <div className="mxgraph-container">
            <div className="mxgraph-toolbar-container">
                <div className="mxgraph-toolbar-container" ref={toolbarRef} />
                <div>{renderAddAttribute()}</div>
                <div>{renderRelationAddAttribute()}</div>
                <div>{renderToggleAttributes()}</div>
                <div>{renderToggleAttrKey()}</div>
                <div>{renderRelationConfiguration()}</div>
                <div>{renderRelationCardinalities()}</div>
                <div>{renderMoveBackAndFrontButtons()}</div>
            </div>
            <div ref={containerRef} className="mxgraph-drawing-container" />
            <Toaster position="bottom-left" />
        </div>
    );
}
