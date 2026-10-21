// Inert by default; a suite that needs the listener to deliver declares its own `expo-sqlite` mock.
jest.mock("expo-sqlite", () => ({
    ...jest.requireActual("expo-sqlite"),
    addDatabaseChangeListener: () => ({ remove: () => {} }),
}));
