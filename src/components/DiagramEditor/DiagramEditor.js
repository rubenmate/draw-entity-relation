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
import { mxCodec, mxConstants, mxPoint, mxUtils } from "mxgraph-js";
import toast, { Toaster } from "react-hot-toast";
import { generateSQL } from "../../utils/sql";
import { POSSIBLE_CARDINALITIES, validateGraph } from "../../utils/validation";
import { setInitialConfiguration } from "./utils";

const { mxGraph, mxEvent } = MxGraph();

export default function App(props) {
    // Define a style with labelPosition set to ALIGN_RIGHT, additional right spacing
    const rightLabelStyle = {};
    rightLabelStyle[mxConstants.STYLE_LABEL_POSITION] = mxConstants.ALIGN_RIGHT;
    rightLabelStyle[mxConstants.STYLE_SPACING_RIGHT] = -40; // Adjust this value to control the extra space to the right
    // Apply font underline to the key attribute label text
    const keyAttrStyle = {};
    keyAttrStyle[mxConstants.STYLE_FONTSTYLE] = mxConstants.FONT_UNDERLINE;

    // Define a style that makes a cell non-resizable and non-movable
    const notResizeableStyle = {};
    notResizeableStyle[mxConstants.STYLE_RESIZABLE] = 0; // Makes the cell non-resizable

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

    function accessCell(idMx) {
        return graph.model.cells[idMx];
    }

    const saveToLocalStorage = () => {
        const diagramData = JSON.stringify(diagramRef.current);
        localStorage.setItem("diagramData", diagramData);
    };

    const recreateGraphFromLocalStorage = () => {
        const recreateAttribute = (attribute, source) => {
            let target;
            let edge;
            // Recreate attribute
            target = graph.insertVertex(
                null,
                attribute.idMx,
                attribute.name,
                attribute.position.x,
                attribute.position.y,
                10,
                10,
                `shape=ellipse;rightLabelStyle;notResizeableStyle;transparentColor;${
                    attribute.key ? "keyAttrStyle" : ""
                }`,
            );
            edge = graph.insertEdge(
                source,
                String(+target.id + 1),
                null,
                source,
                target,
            );
            graph.orderCells(true, [edge]); // Move front the selected entity so the new vertex aren't on top
        };
        const recreateEntity = (entity) => {
            const source = graph.insertVertex(
                null,
                entity.idMx,
                entity.name,
                entity.position.x,
                entity.position.y,
                100,
                40,
                ";shape=rectangle;verticalAlign=middle;align=center;fillColor=#C3D9FF;strokeColor=#6482B9;fontColor=#774400",
            );
            for (const attribute of entity.attributes) {
                recreateAttribute(attribute, source);
            }
        };

        const recreateRelation = (relation) => {
            console.log(relation);
        };

        // Recreate the graph
        if (localStorage.getItem("diagramData"))
            diagramRef.current = JSON.parse(
                localStorage.getItem("diagramData"),
            );

        for (const entity of diagramRef.current.entities) {
            recreateEntity(entity);
        }

        for (const relation of diagramRef.current.relations) {
            recreateRelation(relation);
        }
    };

    React.useEffect(() => {
        if (!graph) {
            mxEvent.disableContextMenu(containerRef.current);
            setGraph(new mxGraph(containerRef.current));
        }
        if (graph) {
            // Override the isCellSelectable function
            mxGraph.prototype.isCellSelectable = function (cell) {
                // Check if the cell is an edge, return false if it is
                if (this.model.isEdge(cell)) {
                    return false;
                }

                // Default behavior for other cells
                return this.isCellsSelectable() && !this.isCellLocked(cell);
            };

            setInitialConfiguration(graph, diagramRef, toolbarRef);

            graph.getModel().endUpdate();
            graph.getSelectionModel().addListener(mxEvent.CHANGE, onSelected);

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

            recreateGraphFromLocalStorage();

            return () => {
                graph.getModel().removeListener(mxEvent.CHANGE, onSelected);
            };
        }
    }, [graph, onSelected]);

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
                saveToLocalStorage();
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

    const onCellsMoved = (_evt) => {
        if (selected) {
            if (selected?.style?.includes("shape=rectangle")) {
                const selectedEntityDiag = diagramRef.current.entities.find(
                    (entity) => entity.idMx === selected.id,
                );

                selectedEntityDiag?.attributes.forEach((attribute) => {
                    accessCell(attribute.cell.at(0)).geometry.x =
                        selected.geometry.x + attribute.offsetX;
                    accessCell(attribute.cell.at(0)).geometry.y =
                        selected.geometry.y + attribute.offsetY;
                });
                // NOTE: Refresh the graph to visually update the cell values
                const graphView = graph.getDefaultParent();
                const view = graph.getView(graphView);
                view.refresh();
            } else if (selected?.style?.includes("shape=rhombus")) {
                const selectedRelationDiag = diagramRef.current.relations.find(
                    (relation) => relation.idMx === selected.id,
                );
                if (selectedRelationDiag.canHoldAttributes) {
                    selectedRelationDiag?.attributes.forEach((attribute) => {
                        accessCell(attribute.cell.at(0)).geometry.x =
                            selected.geometry.x + attribute.offsetX;
                        accessCell(attribute.cell.at(0)).geometry.y =
                            selected.geometry.y + attribute.offsetY;
                    });
                    // NOTE: Refresh the graph to visually update the cell values
                    const graphView = graph.getDefaultParent();
                    const view = graph.getView(graphView);
                    view.refresh();
                }
            } else if (selected?.style?.includes("shape=ellipse")) {
                let parentEntity = diagramRef.current.entities.find((entity) =>
                    entity.attributes.some((attr) => attr.idMx === selected.id),
                );
                // If no parent entity found, check if it's an N:M relation
                if (!parentEntity) {
                    parentEntity = diagramRef.current.relations.find(
                        (relation) =>
                            relation.attributes.some(
                                (attr) => attr.idMx === selected.id,
                            ),
                    );
                }

                if (parentEntity) {
                    const attribute = parentEntity.attributes.find(
                        (attr) => attr.idMx === selected.id,
                    );

                    if (attribute) {
                        // Update offset
                        attribute.offsetX =
                            selected.geometry.x - parentEntity.position.x;
                        attribute.offsetY =
                            selected.geometry.y - parentEntity.position.y;
                    }
                }
            }
        }
        // Ensure that the diagram is updated before
        updateDiagramData();
        saveToLocalStorage();
    };

    React.useEffect(() => {
        if (graph) {
            // Define the listener as a function to refer it for removal
            const handleCellsMoved = (evt) => {
                onCellsMoved(evt);
            };
            // Add the listener
            graph.addListener(mxEvent.CELLS_MOVED, handleCellsMoved);

            updateDiagramData();

            // Cleanup function to remove the listener
            return () => {
                graph.removeListener(handleCellsMoved, mxEvent.CELLS_MOVED);
            };
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

        // Initial offset
        let offsetX = 120;
        let offsetY = -40;

        if (selectedDiag?.attributes?.length) {
            const lastAttribute =
                selectedDiag.attributes[selectedDiag.attributes.length - 1];
            const lastAttrCell = graph.getModel().getCell(lastAttribute.idMx);
            offsetX = lastAttrCell.geometry.x - source.geometry.x;
            offsetY = lastAttrCell.geometry.y - source.geometry.y + 20;
        }

        const newX = selected.geometry.x + offsetX;
        const newY = selected.geometry.y + offsetY;

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
                    offsetX: target.geometry.x - selected.geometry.x,
                    offsetY: target.geometry.y - selected.geometry.y,
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
                    offsetX: target.geometry.x - selected.geometry.x,
                    offsetY: target.geometry.y - selected.geometry.y,
                });
        }
        toast.success("Atributo insertado");
        // TODO:  Increment the offset so that new attributes are not added on top of others
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
            const source = selected;
            const relation = diagramRef.current.relations.find(
                (relation) => relation.idMx === source.id,
            );

            if (relation.side1.idMx !== "" && relation.side2.idMx !== "") {
                // Find the previous edges
                const cardinality1 = accessCell(relation.side1.idMx);
                const cardinality2 = accessCell(relation.side2.idMx);
                const edge1 = accessCell(relation.side1.edgeId);
                const edge2 = accessCell(relation.side2.edgeId);

                // Remove the previous edges from the graph
                if (cardinality1) {
                    graph.removeCells([cardinality1]);
                }
                if (cardinality2) {
                    graph.removeCells([cardinality2]);
                }
                // Remove the previous edges from the graph
                if (edge1) {
                    graph.removeCells([edge1]);
                }
                if (edge2) {
                    graph.removeCells([edge2]);
                }
            }

            const target1 = accessCell(side1.idMx);
            const target2 = accessCell(side2.idMx);

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

            selectedDiag.side1.edgeId = edge1.id;
            selectedDiag.side2.edgeId = edge2.id;

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

            if (side1.endsWith(":N") && side2.endsWith(":N")) {
                selectedDiag.canHoldAttributes = true;
            } else {
                selectedDiag.canHoldAttributes = false;
            }

            const label1 = accessCell(selectedDiag.side1.cell);
            const label2 = accessCell(selectedDiag.side2.cell);

            graph.model.setValue(label1, side1);
            graph.model.setValue(label2, side2);
            // NOTE: Refresh the graph to visually update the cell values
            const graphView = graph.getDefaultParent();
            const view = graph.getView(graphView);
            view.refresh();

            setSide1("");
            setSide2("");
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
                                            {POSSIBLE_CARDINALITIES.filter(
                                                (cardinality) =>
                                                    cardinality !== "1:1" ||
                                                    side2 !== "1:1",
                                            ).map((cardinality) => (
                                                <MenuItem
                                                    key={cardinality}
                                                    value={cardinality}
                                                >
                                                    {cardinality}
                                                </MenuItem>
                                            ))}
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
                                            {POSSIBLE_CARDINALITIES.filter(
                                                (cardinality) =>
                                                    cardinality !== "1:1" ||
                                                    side1 !== "1:1",
                                            ).map((cardinality) => (
                                                <MenuItem
                                                    key={cardinality}
                                                    value={cardinality}
                                                >
                                                    {cardinality}
                                                </MenuItem>
                                            ))}
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

    const renderDeleteEntity = () => {
        const isEntity = selected?.style?.includes("shape=rectangle");
        function deleteEntity() {
            // Find the entity in diagramRef.current.entities
            const entityIndex = diagramRef.current.entities.findIndex(
                (entity) => entity.idMx === selected.id,
            );

            if (entityIndex !== -1) {
                const entity = diagramRef.current.entities[entityIndex];

                // Remove the entity from diagramRef.current.entities
                diagramRef.current.entities.splice(entityIndex, 1);

                // Find the corresponding cell in graph.model.cells
                const cell = accessCell(entity.idMx);

                if (cell) {
                    // Collect the attribute cells to delete
                    const attributeCells = entity.attributes.flatMap((attr) => {
                        return accessCell(attr.cell.at(0));
                    });

                    // Remove the entity's cell and its attributes from the graph
                    graph.removeCells([cell, ...attributeCells]);

                    // Check and remove relations involving this entity
                    diagramRef.current.relations.forEach((relation, index) => {
                        if (
                            relation.side1.entity.idMx === entity.idMx ||
                            relation.side2.entity.idMx === entity.idMx
                        ) {
                            // Find the corresponding cells in graph.model.cells for the relation
                            const side1Cell = accessCell(relation.side1.cell);
                            const side2Cell = accessCell(relation.side2.cell);
                            const edge1Cell = accessCell(relation.side1.edgeId);
                            const edge2Cell = accessCell(relation.side2.edgeId);

                            // Collect the relation's attribute cells to delete
                            const relationAttributeCells =
                                relation.attributes.flatMap((attr) =>
                                    accessCell(attr.cell.at(0)),
                                );

                            // Remove the relation's cells and its attributes from the graph
                            graph.removeCells([
                                side1Cell,
                                side2Cell,
                                edge1Cell,
                                edge2Cell,
                                ...relationAttributeCells,
                            ]);

                            // Reinitialize the relation sides
                            diagramRef.current.relations[index].side1 = {
                                idMx: "",
                                cardinality: "",
                                cell: "",
                                edgeId: "",
                                entity: { idMx: "" },
                            };
                            diagramRef.current.relations[index].side2 = {
                                idMx: "",
                                cardinality: "",
                                cell: "",
                                edgeId: "",
                                entity: { idMx: "" },
                            };
                            diagramRef.current.relations[
                                index
                            ].canHoldAttributes = false;
                        }
                    });
                }
            }
            saveToLocalStorage();
        }
        if (isEntity) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={deleteEntity}
                >
                    Borrar
                </button>
            );
        }
    };

    const renderDeleteAttribute = () => {
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

        function deleteAttribute(isRelation) {
            if (!isRelation) {
                // Find the entity that contains the attribute
                const entity = diagramRef.current.entities.find((entity) =>
                    entity.attributes.some((attr) => attr.idMx === selected.id),
                );

                if (entity) {
                    // Find the attribute index
                    const attrIndex = entity.attributes.findIndex(
                        (attr) => attr.idMx === selected.id,
                    );

                    if (attrIndex !== -1) {
                        const attribute = entity.attributes[attrIndex];

                        // Remove the attribute from the entity
                        entity.attributes.splice(attrIndex, 1);

                        // Find the corresponding cells in graph.model.cells
                        const cells = attribute.cell.map(
                            (cellId) => graph.model.cells[cellId],
                        );

                        if (cells.length) {
                            // Remove the cells from the graph
                            graph.removeCells(cells);
                        }
                    }
                }
            } else {
                // Find the relation that contains the attribute
                const relation = diagramRef.current.relations.find((relation) =>
                    relation.attributes.some(
                        (attr) => attr.idMx === selected.id,
                    ),
                );

                if (relation) {
                    // Find the attribute index
                    const attrIndex = relation.attributes.findIndex(
                        (attr) => attr.idMx === selected.id,
                    );

                    if (attrIndex !== -1) {
                        const attribute = relation.attributes[attrIndex];

                        // Remove the attribute from the relation
                        relation.attributes.splice(attrIndex, 1);

                        // Find the corresponding cells in graph.model.cells
                        const cells = attribute.cell.map(
                            (cellId) => graph.model.cells[cellId],
                        );

                        if (cells.length) {
                            // Remove the cells from the graph
                            graph.removeCells(cells);
                        }
                    }
                }
            }
            saveToLocalStorage();
        }

        if (
            (isAttribute && !isKey && !isFromRelation) ||
            (isAttribute && isFromRelation)
        ) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={() => deleteAttribute(isFromRelation)}
                >
                    Borrar
                </button>
            );
        }
    };

    const renderDeleteRelation = () => {
        const isRelation = selected?.style?.includes("shape=rhombus");

        function deleteRelation() {
            // Find the relation in diagramRef.current.relations
            const relationIndex = diagramRef.current.relations.findIndex(
                (relation) => relation.idMx === selected.id,
            );

            if (relationIndex !== -1) {
                const relation = diagramRef.current.relations[relationIndex];

                // Remove the relation from diagramRef.current.relations
                diagramRef.current.relations.splice(relationIndex, 1);

                const cell = accessCell(relation.idMx);

                if (cell) {
                    // Remove the attributes associated with the entity
                    const attributeCells = relation.attributes.flatMap(
                        (attr) => {
                            // NOTE: Seems that we only need to delete the label and ellipse
                            // because the edge is deleted when deleting the parent object
                            return accessCell(attr.cell.at(0));
                        },
                    );

                    // Remove the cell and its attributes from the graph
                    graph.removeCells([cell, ...attributeCells]);
                }
            }
            saveToLocalStorage();
        }

        if (isRelation) {
            return (
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={deleteRelation}
                >
                    Borrar
                </button>
            );
        }
    };

    const renderGenerateSQLButton = () => {
        const [open, setOpen] = React.useState(false);
        const [acceptDisabled, setAcceptDisabled] = React.useState(true);
        const [validationMessages, setValidationMessages] = React.useState([]);

        const handleClickOpen = () => {
            setRefreshDiagram((prevState) => !prevState);
            const diagnostics = validateGraph(diagramRef.current);

            if (diagnostics.isValid) {
                setAcceptDisabled(false);
                setValidationMessages([
                    "¿Deseas pasar a tablas el diagrama E-R?",
                ]);
            } else {
                setAcceptDisabled(true);
                const messages = [
                    "No se ha podido generar el script SQL por los siguientes errores:",
                ];
                if (!diagnostics.notEmpty)
                    messages.push("El diagrama está vacío.");
                if (!diagnostics.noRepeatedNames)
                    messages.push("Hay entidades con nombres repetidos.");
                if (!diagnostics.noRepeatedAttrNames)
                    messages.push("Hay atributos repetidos en una entidad.");
                if (!diagnostics.noEntitiesWithoutAttributes)
                    messages.push("Hay entidades sin atributos.");
                if (!diagnostics.noEntitiesWithoutPK)
                    messages.push("Hay entidades sin clave primaria.");
                if (!diagnostics.noUnconnectedRelations)
                    messages.push("Hay relaciones desconectadas.");
                if (!diagnostics.noNotValidCardinalities)
                    messages.push(
                        "Hay cardinalidades no válidas en las relaciones.",
                    );
                setValidationMessages(messages);
            }
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            setOpen(false);
            const sqlScript = generateSQL(diagramRef.current);

            // Create a blob with the SQL script
            const blob = new Blob([sqlScript], { type: "text/plain" });

            // Create a link element
            const link = document.createElement("a");

            // Set the download attribute with a filename
            link.download = "tables.sql";

            // Create a URL for the blob and set it as the href attribute
            link.href = window.URL.createObjectURL(blob);

            // Append the link to the body
            document.body.appendChild(link);

            // Programmatically click the link to trigger the download
            link.click();

            // Remove the link from the document
            document.body.removeChild(link);
        };

        return (
            <>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    Generar SQL
                </button>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Generación script SQL"}
                    </DialogTitle>
                    <DialogContent>
                        {validationMessages.map((message) => (
                            <DialogContentText key={message}>
                                {message}
                            </DialogContentText>
                        ))}
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
    };

    const renderResetCanvasButton = () => {
        const [open, setOpen] = React.useState(false);

        const handleClickOpen = () => {
            setOpen(true);
        };

        const handleClose = () => {
            setOpen(false);
        };

        const handleAccept = () => {
            diagramRef.current.entities = [];
            diagramRef.current.relations = [];
            localStorage.removeItem("diagramData");

            // Filter out cells that aren't key 0 or 1
            const cellsToRemove = Object.keys(graph.model.cells)
                .filter((key) => key !== "0" && key !== "1")
                .map((key) => graph.model.cells[key]);

            // Remove the filtered cells
            graph.removeCells(cellsToRemove);

            setRefreshDiagram((prevState) => !prevState);
            setOpen(false);
        };

        return (
            <>
                <button
                    type="button"
                    className="button-toolbar-action"
                    onClick={handleClickOpen}
                >
                    Reiniciar
                </button>
                <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {"Reiniciar diagrama"}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            ¿Estás seguro de que deseas reiniciar el diagrama?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>Cancelar</Button>
                        <Button onClick={handleAccept} autoFocus>
                            Aceptar
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
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

                <div>{renderDeleteEntity()}</div>
                <div>{renderDeleteRelation()}</div>
                <div>{renderDeleteAttribute()}</div>

                <div>{renderMoveBackAndFrontButtons()}</div>

                <div>{renderGenerateSQLButton()}</div>
                <div>{renderResetCanvasButton()}</div>
            </div>
            <div ref={containerRef} className="mxgraph-drawing-container" />
            <Toaster position="bottom-left" />
        </div>
    );
}
