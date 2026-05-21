import assert from "node:assert/strict";
import test from "node:test";

import { createMockPiApi } from "./fixtures/mock-pi-api.mjs";

test("mock Pi API fixture records tool and command registrations", async () => {
  const { api, registeredTools, registeredCommands } = createMockPiApi();

  api.registerTool({
    name: "example_tool",
    label: "Example Tool",
    description: "Example tool used only to validate the mock Pi API fixture.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      return {
        content: [{ type: "text", text: "ok" }],
        details: {},
      };
    },
  });

  api.registerCommand("example", {
    description: "Example command",
    handler() {},
  });

  assert.deepEqual(
    registeredTools.map((tool) => tool.name),
    ["example_tool"],
  );
  assert.equal(registeredCommands.get("example")?.description, "Example command");

  const result = await registeredTools[0].execute("call-1", {}, undefined, undefined, { cwd: process.cwd() });
  assert.deepEqual(result, {
    content: [{ type: "text", text: "ok" }],
    details: {},
  });
});
