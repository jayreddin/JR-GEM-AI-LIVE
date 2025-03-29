/**
 * Manages the registration and execution of tools that can be called by the Gemini agent.
 * Tools must provide specific methods (`getDeclaration`, `execute`) to be compatible.
 */
export class ToolManager {
    /**
     * Initializes a new ToolManager instance with an empty tool registry.
     */
    constructor() {
        // Use a Map to store registered tools, mapping tool name (string) to tool instance (object).
        this.tools = new Map();
        console.info("ToolManager initialized.");
    }

    /**
     * Registers a tool instance, making it available for the agent to call.
     * The tool instance must implement `getDeclaration()` and `execute()` methods.
     * @param {string} name - The unique name identifying the tool (must match the name in the declaration).
     * @param {Object} toolInstance - An instance of the tool class/object.
     * @throws {Error} If the name is invalid or the tool instance is missing required methods.
     */
    registerTool(name, toolInstance) {
        // Validate input name
        if (!name || typeof name !== 'string' || name.trim() === '') {
            console.error("ToolManager.registerTool Error: Invalid tool name provided.", name);
            throw new Error("Invalid tool name. Must be a non-empty string.");
        }
        // Validate tool instance structure
        if (!toolInstance || typeof toolInstance.execute !== 'function' || typeof toolInstance.getDeclaration !== 'function') {
            console.error(`ToolManager.registerTool Error: Tool instance for "${name}" is invalid or missing required methods (execute, getDeclaration).`, toolInstance);
            throw new Error(`Tool instance for "${name}" must implement getDeclaration() and execute() methods.`);
        }

        // Check if tool with the same name is already registered
        if (this.tools.has(name)) {
            console.warn(`ToolManager.registerTool Warning: Tool "${name}" is already registered. Overwriting previous registration.`);
            // Allow overwriting, but log a warning. Alternatively, throw an error if overwriting is not desired.
            // throw new Error(`Tool "${name}" is already registered.`);
        }

        this.tools.set(name, toolInstance);
        console.info(`ToolManager: Tool "${name}" registered successfully.`);
    }

    /**
     * Collects and returns the declarations from all registered tools.
     * These declarations are typically sent to the Gemini API during setup.
     * @returns {Array<Object>} An array of tool declaration objects. Returns empty array if no tools registered.
     */
    getToolDeclarations() {
        if (this.tools.size === 0) {
            // console.debug("ToolManager.getToolDeclarations: No tools registered.");
            return [];
        }

        const allDeclarations = [];
        console.info(`ToolManager: Collecting declarations from ${this.tools.size} registered tool(s)...`);

        this.tools.forEach((toolInstance, toolName) => {
            try {
                // Ensure the method exists (though checked during registration)
                if (typeof toolInstance.getDeclaration === 'function') {
                    const declaration = toolInstance.getDeclaration();
                    // Basic validation of declaration structure (at minimum, should have a name matching the key)
                    if (!declaration || typeof declaration !== 'object' || declaration.name !== toolName) {
                        console.warn(`ToolManager Warning: Tool "${toolName}" provided an invalid or mismatched declaration object:`, declaration);
                        // Optionally skip adding invalid declarations
                        // return; // Skip this tool
                    }
                    allDeclarations.push(declaration);
                    // console.debug(`ToolManager: Added declaration for "${toolName}".`);
                } else {
                    // This case should ideally not happen due to checks in registerTool
                    console.error(`ToolManager Error: Registered tool "${toolName}" is missing getDeclaration method during declaration collection.`);
                }
            } catch (error) {
                console.error(`ToolManager Error: Failed to get declaration from tool "${toolName}":`, error);
                // Decide whether to halt or continue collecting other declarations
            }
        });

        console.info(`ToolManager: Collected ${allDeclarations.length} tool declaration(s).`);
        return allDeclarations;
    }

    /**
     * Handles an incoming function call request from the Gemini agent.
     * Finds the corresponding registered tool and executes it with the provided arguments.
     * @param {Object} functionCall - The function call object received from the agent.
     * @param {string} functionCall.name - The name of the tool to execute.
     * @param {Object} [functionCall.args] - An object containing the arguments for the tool.
     * @param {string} functionCall.id - A unique identifier for this specific tool call instance (needed for the response).
     * @returns {Promise<{id: string, output: any, error: string|null}>} A promise resolving to an object containing the execution result (output or error) and the original call ID.
     */
    async handleToolCall(functionCall) {
        // Validate the functionCall structure
        if (!functionCall || typeof functionCall !== 'object' || typeof functionCall.name !== 'string' || typeof functionCall.id !== 'string') {
            console.error("ToolManager.handleToolCall Error: Received invalid functionCall object.", functionCall);
            // Cannot proceed without a valid name and ID. We might not have an ID to send back an error.
            // If an ID exists, try to send an error response.
            const id = functionCall?.id || 'unknown_id';
            return {
                id: id,
                output: null,
                error: "Invalid function call structure received from agent."
            };
        }

        const { name, args, id } = functionCall;
        console.info(`ToolManager: Received request to handle tool call: "${name}" (ID: ${id})`, { args });

        // Find the registered tool instance
        const tool = this.tools.get(name);

        if (!tool) {
            console.error(`ToolManager Error: Tool "${name}" is not registered.`);
            return {
                id: id,
                output: null,
                error: `Tool "${name}" is not registered or available.`
            };
        }

        // Execute the tool's logic
        try {
            // Ensure execute method exists (should be guaranteed by registration check)
            if (typeof tool.execute !== 'function') {
                throw new Error(`Registered tool "${name}" is missing the execute method.`);
            }

            const result = await tool.execute(args);
            console.info(`ToolManager: Tool "${name}" (ID: ${id}) executed successfully.`);
            // console.debug(`ToolManager: Result for "${name}" (ID: ${id}):`, result);
            return {
                id: id,
                output: result, // The result can be any JSON-serializable type expected by the agent
                error: null
            };
        } catch (error) {
            console.error(`ToolManager Error: Tool "${name}" (ID: ${id}) execution failed:`, error);
            return {
                id: id,
                output: null,
                // Send back the error message
                // Check if error object has a message property, otherwise stringify
                error: error?.message || String(error) || "Tool execution failed with an unknown error."
            };
        }
    }
}