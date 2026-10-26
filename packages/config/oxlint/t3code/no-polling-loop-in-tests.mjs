// Ported from https://github.com/pingdotgg/t3code/blob/3f9448747bb8848050dc2cacf83affa6f94a66a1/oxlint-plugin-t3code/rules/no-polling-loop-in-tests.ts under the MIT License in ./LICENSE.

const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const FUNCTIONS = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);
const COUNTER_OPERATORS = new Set(["<", "<=", ">", ">="]);
const TIMERS = new Set(["setImmediate", "setTimeout"]);
const MESSAGE =
    "Polling loop in a test. Spinning on `yieldNow`/`sleep`/timer ticks is scheduler- and load-dependent. Await the `Deferred`, `Queue.take`, `Stream` element, promise, or `expect.poll` that marks the milestone.";

const unwrap = (node) => {
    let current = node;
    while (
        current?.type === "ChainExpression" ||
        current?.type === "ParenthesizedExpression" ||
        current?.type === "TSNonNullExpression" ||
        current?.type === "TSAsExpression" ||
        current?.type === "TSTypeAssertion"
    ) {
        current = current.expression;
    }
    return current;
};

const isNode = (value) => value instanceof Object && "type" in value;

const someDescendant = (node, match) => {
    if (Array.isArray(node)) {
        return node.some((child) => someDescendant(child, match));
    }
    if (!isNode(node)) {
        return false;
    }
    if (match(node)) {
        return true;
    }
    if (FUNCTIONS.has(node.type)) {
        return false;
    }
    return Object.entries(node).some(([key, value]) => key !== "parent" && someDescendant(value, match));
};

const isIdentifier = (node, name) => {
    const expression = unwrap(node);
    return expression?.type === "Identifier" && (name === undefined || expression.name === name);
};

const isMember = (node, object, property) => {
    const expression = unwrap(node);
    return (
        expression?.type === "MemberExpression" &&
        !expression.computed &&
        isIdentifier(expression.object, object) &&
        isIdentifier(expression.property, property)
    );
};

const isTimerReference = (node) => {
    const expression = unwrap(node);
    return expression?.type === "Identifier" && TIMERS.has(expression.name);
};

const isTickPromise = (node) => {
    const expression = unwrap(node);
    if (expression?.type === "CallExpression") {
        return isMember(expression.callee, "Promise", "resolve");
    }
    if (expression?.type !== "NewExpression" || !isIdentifier(expression.callee, "Promise")) {
        return false;
    }
    const [executor] = expression.arguments;
    if (isTimerReference(executor)) {
        return true;
    }
    if (!isNode(executor) || !FUNCTIONS.has(executor.type)) {
        return false;
    }
    return someDescendant(executor.body, (child) => child.type === "CallExpression" && isTimerReference(child.callee));
};

const thunkReturnsTick = (node) => {
    if (node?.type !== "ArrowFunctionExpression") {
        return false;
    }
    const { body } = node;
    if (body.type !== "BlockStatement") {
        return isTickPromise(body);
    }
    const last = body.body.at(-1);
    return last?.type === "ReturnStatement" && isTickPromise(last.argument);
};

const isWait = (node) => {
    if (node.type === "MemberExpression") {
        return isMember(node, "Effect", "yieldNow");
    }
    if (node.type === "AwaitExpression") {
        return isTickPromise(node.argument);
    }
    if (node.type === "NewExpression") {
        return isTickPromise(node);
    }
    if (node.type !== "CallExpression") {
        return false;
    }
    if (isMember(node.callee, "Effect", "sleep") || isIdentifier(node.callee, "setImmediate")) {
        return true;
    }
    return isMember(node.callee, "Effect", "promise") && thunkReturnsTick(node.arguments[0]);
};

const hasConditionalExit = (body) =>
    someDescendant(
        body,
        (node) =>
            node.type === "IfStatement" &&
            someDescendant(
                [node.consequent, node.alternate],
                (child) =>
                    child.type === "ReturnStatement" ||
                    child.type === "BreakStatement" ||
                    child.type === "ThrowStatement"
            )
    );

const isNumericBound = (node) => {
    const expression = unwrap(node);
    return expression?.type === "Identifier" || (expression?.type === "Literal" && Number.isFinite(expression.value));
};

const updatesCounter = (node, name) =>
    someDescendant(
        node,
        (child) =>
            (child.type === "UpdateExpression" && isIdentifier(child.argument, name)) ||
            (child.type === "AssignmentExpression" &&
                (child.operator === "+=" || child.operator === "-=") &&
                isIdentifier(child.left, name))
    );

const isCounterTest = (loop) => {
    if (loop.test == null) {
        return false;
    }
    const expression = unwrap(loop.test);
    if (expression?.type !== "BinaryExpression" || !COUNTER_OPERATORS.has(expression.operator)) {
        return false;
    }
    const { left, right } = expression;
    const advances = [loop.body, loop.type === "ForStatement" ? loop.update : null];
    return [
        [left, right],
        [right, left],
    ].some(([counter, bound]) => {
        const name = unwrap(counter);
        return name?.type === "Identifier" && isNumericBound(bound) && updatesCounter(advances, name.name);
    });
};

const isTrueLiteral = (test) => {
    const expression = unwrap(test);
    return expression?.type === "Literal" && expression.value === true;
};

const hasPredicateExit = (loop) =>
    hasConditionalExit(loop.body) || (loop.test != null && !isTrueLiteral(loop.test) && !isCounterTest(loop));

export default {
    create(context) {
        if (!TEST_FILE_PATTERN.test(context.filename)) {
            return {};
        }
        const check = (loop) => {
            if (someDescendant(loop.body, isWait) && hasPredicateExit(loop)) {
                context.report({ message: MESSAGE, node: loop });
            }
        };
        return { DoWhileStatement: check, ForStatement: check, WhileStatement: check };
    },
    meta: {
        docs: {
            description:
                "Disallow loops in tests that spin on timer ticks until a predicate holds; await the milestone instead.",
        },
        schema: [],
        type: "problem",
    },
};
