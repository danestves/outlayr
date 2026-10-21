declare module "*.png" {
    const asset: import("react-native").ImageRequireSource;
    export default asset;
}

declare module "*.jpg" {
    const asset: import("react-native").ImageRequireSource;
    export default asset;
}

declare module "*.webp" {
    const asset: import("react-native").ImageRequireSource;
    export default asset;
}
