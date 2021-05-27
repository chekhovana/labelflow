import "fake-indexeddb/auto";

import { createExample, example, examples } from "../example";
import { db } from "../../../database";

describe("Example resolver test suite", () => {
  beforeEach(async () => {
    db.tables.map((table) => table.clear());
  });

  test("Query example when db is empty", async () => {
    const queryResult = await examples(undefined, {});
    expect(queryResult.length).toBe(0);
  });

  test("Successfully creating an example", async () => {
    const createResult = await createExample(undefined, {
      data: { name: "test" },
    });

    expect(createResult?.name).toBe("test");

    const queryResult = await db.example.get(createResult.id);
    expect(createResult).toEqual(queryResult);
  });

  test("Querying one example", async () => {
    const testExample = {
      id: "1234567",
      updatedAt: "someDate",
      createdAt: "anotherDate",
      name: "test",
    };

    await db.example.add(testExample);

    const queryResult = await example(undefined, {
      where: { id: "1234567" },
    });

    expect(queryResult).toEqual(testExample);
  });

  test("Querying Several examples", async () => {
    const testExamples = [
      {
        id: "1",
        updatedAt: "someDate",
        createdAt: "anotherDate",
        name: "test1",
      },
      {
        id: "2",
        updatedAt: "someDate",
        createdAt: "anotherDate",
        name: "test2",
      },
      {
        id: "3",
        updatedAt: "someDate",
        createdAt: "anotherDate",
        name: "test3",
      },
    ];

    await Promise.all(
      testExamples.map((testExample) => db.example.add(testExample))
    );

    const queryResult = await examples(undefined, {});

    expect(queryResult).toEqual(expect.arrayContaining(testExamples));
    expect(testExamples).toEqual(expect.arrayContaining(queryResult));
    expect(queryResult[3]).toBeUndefined();
  });

  test("Querying paginated examples", async () => {
    const testExamples = [
      {
        id: "1",
        updatedAt: "someDate",
        createdAt: "anotherDate",
        name: "test1",
      },
      {
        id: "2",
        updatedAt: "someDate",
        createdAt: "anotherDate",
        name: "test2",
      },
      {
        id: "3",
        updatedAt: "someDate",
        createdAt: "anotherDate",
        name: "test3",
      },
      {
        id: "4",
        updatedAt: "someDate",
        createdAt: "anotherDate",
        name: "test4",
      },
    ];

    await Promise.all(
      testExamples.map((testExample) => db.example.add(testExample))
    );

    const queryResult = await examples(undefined, { skip: 1, first: 2 });

    expect(testExamples).toEqual(expect.arrayContaining(queryResult));
    expect(queryResult.length).toBe(2);
  });
});
