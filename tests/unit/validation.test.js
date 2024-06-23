import { beforeEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { 
    repeatedAttributesInEntity, 
    repeatedEntities, 
    entitiesWithoutAttributes,
    relationsUnconnected,
    validateGraph, 
    cardinalitiesNotValid,
    notNMRelationsWithAttributes
} from "../../src/utils/validation"

let graph;

beforeEach(() => {
  // Load fresh data before each test
  const data = readFileSync(resolve(__dirname, './graphs/example.json'), 'utf-8');
  graph = JSON.parse(data);
});

describe("General validation function", () => {
    test("correct graph return true", () => {
        expect(validateGraph(graph)).toBe(true)
    })
})

describe('Non repeated entity or n:m relation name', ()=> {
    test("entities can't have repeated names", () => {
        expect(repeatedEntities(graph)).toBe(false);
        // Access an entity and set its name to an already existing entity name
        graph.entities.at(1).name = graph.entities.at(0).name
        expect(repeatedEntities(graph)).toBe(true);
    })

    test("N:M relations and entities can't have repeated names", () => {
        expect(repeatedEntities(graph)).toBe(false);
        // Access the N:M relation and set its name to an already existing entity name
        graph.relations.at(0).name = graph.entities.at(0).name
        expect(repeatedEntities(graph)).toBe(true);
    })
})

describe("Non repeated attributes in entities or n:m relations", ()=> {
    test("entities can't have repeated attributes names", () => {
        expect(repeatedAttributesInEntity(graph)).toBe(false);
        // Set an attribute in an entity to the same name of other
        graph.entities.at(0).attributes.at(1).name = graph.entities.at(0).attributes.at(0).name
        expect(repeatedAttributesInEntity(graph)).toBe(true);
    })

    test("N:M relations can't have repeated attributes names", () => {
        // Test the graph without repeated attributes
        expect(repeatedAttributesInEntity(graph)).toBe(false);
        // Set an attribute in an N:M relation to the same name of other
        graph.relations.at(0).attributes.at(1).name = graph.relations.at(0).attributes.at(0).name
        expect(repeatedAttributesInEntity(graph)).toBe(true);
    })
})

describe("Every entity should have at least one attribute", () => {
    test("entities must have at least one attribute", () => {
        // Ensure the graph is valid initially
        expect(entitiesWithoutAttributes(graph)).toBe(false);
        // Remove attributes from an entity
        graph.entities.at(0).attributes = [];
        expect(entitiesWithoutAttributes(graph)).toBe(true);
    });

    test("N:M relations must have at least one attribute", () => {
        // Ensure the graph is valid initially
        expect(entitiesWithoutAttributes(graph)).toBe(false);
        // Remove attributes from an N:M relation
        graph.relations.at(0).attributes = [];
        expect(entitiesWithoutAttributes(graph)).toBe(true);
    });
});

describe("Relations", () => {
    test("Every relation should connect two entities (can be the same at both sides)", () => {
        // Ensure the graph is valid initially
        expect(relationsUnconnected(graph)).toBe(false);

        const initializedSide = { 
            cardinality: "",
            cell: "",
            entity: {
                idMx: "",
            },
            idMx: "",
        }
        // Remove attributes from an entity
        graph.relations.at(1).side1 = initializedSide;
        graph.relations.at(1).side2 = initializedSide;
        expect(relationsUnconnected(graph)).toBe(true);
    });

    test("Cant be relations with attributes if they are not N:M", () => {
        // Ensure the graph is valid initially
        expect(relationsUnconnected(graph)).toBe(false);

        const attributes = [
            {
                "idMx":"9",
                "name":"Atributo",
                "position":{
                    "x":560,
                    "y":130
                },
                "cell":[
                    "9",
                    "10"
                ]
            },
        ]
        // Remove attributes from an entity
        graph.relations.at(1).attributes = attributes
        expect(notNMRelationsWithAttributes(graph)).toBe(true);
    });

    test("Every relation should have valid cardinalities", () => {
        // Ensure the graph is valid initially
        expect(cardinalitiesNotValid(graph)).toBe(false);

        const initializedSide1 = { 
            cardinality: "",
            cell: "20",
            entity: {
                idMx: "",
            },
            idMx: "",
        }
        const initializedSide2 = { 
            cardinality: "",
            cell: "24",
            entity: {
                idMx: "",
            },
            idMx: "",
        }
        // Remove attributes from an entity
        graph.relations.at(1).side1 = initializedSide1;
        graph.relations.at(1).side2 = initializedSide2;
        expect(cardinalitiesNotValid(graph)).toBe(true);
    });
});
