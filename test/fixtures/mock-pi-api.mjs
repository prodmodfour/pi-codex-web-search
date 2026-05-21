export function createMockPiApi() {
  const registeredTools = [];
  const registeredCommands = new Map();

  const api = {
    registerTool(tool) {
      registeredTools.push(tool);
    },
    registerCommand(name, options) {
      registeredCommands.set(name, options);
    },
  };

  return {
    api,
    registeredTools,
    registeredCommands,
  };
}
