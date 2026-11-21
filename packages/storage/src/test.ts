import schema from "./component/schema";

export const storageComponent = {
    modules: import.meta.glob("./component/**/*.ts"),
    schema,
};
