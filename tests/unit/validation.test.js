import { beforeAll, expect, test } from 'vitest'
import { repeatedEntities } from "../../src/utils/validation"

let graph;

beforeAll(() => {
    // Import and convert the example JSON to an Object
    // Assuming you have an example JSON file located at '../../example.json'
    graph = require('../../src/utils/examplegraph.json');
});

test("entities can't have repeated names", () => {
    expect(repeatedEntities(graph)).toBe(false);
});

test("N:M relations and entities can't have repeated names", () => {
    // Access the N:M relation and set its name to an already existing entity name
    // TODO: 
    expect(repeatedEntities(graph)).toBe(true);
});
