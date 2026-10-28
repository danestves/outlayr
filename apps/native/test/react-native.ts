import { createElement } from "react";
import type { ReactNode } from "react";
import { vi } from "vite-plus/test";

const OS = (process.env.EXPO_OS ?? "ios") as "ios" | "android";

interface HostProps {
    children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
    onPress?: () => void;
    testID?: string;
}

const host = (tag: "div" | "span") =>
    function Host({ children, onPress, testID }: HostProps = {}) {
        return createElement(
            tag,
            { "data-testid": testID, onClick: onPress },
            typeof children === "function" ? children({ pressed: false }) : children
        );
    };

const Passthrough = host("div");

export const Platform = {
    OS,
    constants: { reactNativeVersion: { major: 0, minor: 88, patch: 0 } },
    Version: OS === "ios" ? "26.0" : 36,
    isTV: false,
    select: <T>(options: { ios?: T; android?: T; native?: T; default?: T }): T | undefined =>
        options[OS] ?? options.native ?? options.default,
};

export const View = Passthrough;
export const Text = host("span");
export const Pressable = Passthrough;
export const ScrollView = Passthrough;
export const TextInput = Passthrough;
export const Switch = Passthrough;
export const Image = Object.assign(host("div"), {
    resolveAssetSource: Object.assign((source: unknown) => source, { addCustomSourceTransformer: () => undefined }),
});
export const FlatList = Passthrough;
export const KeyboardAvoidingView = Passthrough;
export const StatusBar = Passthrough;

export const StyleSheet = {
    create: <T>(styles: T): T => styles,
    flatten: (style: unknown) => style,
    hairlineWidth: 1,
    absoluteFill: {},
    absoluteFillObject: {},
};

export const PlatformColor = (...names: string[]) => ({ semantic: names });

export const Alert = { alert: vi.fn() };
export const Share = { share: vi.fn(async () => ({ action: "sharedAction" })) };
export const Linking = {
    openURL: vi.fn(async () => true),
    canOpenURL: vi.fn(async () => true),
    openSettings: vi.fn(async () => undefined),
    getInitialURL: vi.fn(async () => null),
    addEventListener: vi.fn(() => ({ remove: () => undefined })),
    sendIntent: vi.fn(async () => undefined),
};
export const AppState = {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove: () => undefined })),
};
export const Keyboard = {
    dismiss: vi.fn(),
    addListener: vi.fn(() => ({ remove: () => undefined })),
    isVisible: () => false,
};
export const BackHandler = {
    addEventListener: vi.fn(() => ({ remove: () => undefined })),
    exitApp: vi.fn(),
};
export const AccessibilityInfo = {
    isReduceMotionEnabled: vi.fn(async () => false),
    isScreenReaderEnabled: vi.fn(async () => false),
    addEventListener: vi.fn(() => ({ remove: () => undefined })),
    announceForAccessibility: vi.fn(),
};
export const NativeModules = {};
export const TurboModuleRegistry = { get: () => null, getEnforcing: () => ({}) };

export const useWindowDimensions = () => ({ width: 393, height: 852, scale: 3, fontScale: 1 });
export const useColorScheme = () => "light";

export const PixelRatio = { get: () => 3, getFontScale: () => 1, roundToNearestPixel: (size: number) => size };
export const AssetRegistry = { registerAsset: (asset: unknown) => asset, getAssetByID: () => undefined };
export const codegenNativeComponent = () => Passthrough;
export const codegenNativeCommands = () => ({});
export const requireNativeComponent = () => Passthrough;
export const processColor = (color: unknown) => color;
export const findNodeHandle = () => null;
export const UIManager = {};
export const DeviceEventEmitter = { addListener: vi.fn(() => ({ remove: () => undefined })), emit: vi.fn() };
export class NativeEventEmitter {
    addListener() {
        return { remove: () => undefined };
    }

    removeAllListeners() {
        return undefined;
    }
}
export const I18nManager = { isRTL: false, getConstants: () => ({ isRTL: false }) };
export const Dimensions = {
    get: () => ({ width: 393, height: 852, scale: 3, fontScale: 1 }),
    addEventListener: vi.fn(() => ({ remove: () => undefined })),
};
export const Appearance = {
    getColorScheme: () => "light",
    addChangeListener: vi.fn(() => ({ remove: () => undefined })),
};
export const customDirectEventTypes = {};
export const customBubblingEventTypes = {};

export const Animated = {
    Text: host("span"),
    View: Passthrough,
    createAnimatedComponent: <T>(component: T): T => component,
    timing: () => ({ start: (done?: () => void) => done?.(), stop: () => undefined }),
    Value: class {
        readonly value: number;

        constructor(value: number) {
            this.value = value;
        }
    },
};
export const PanResponder = { create: () => ({ panHandlers: {} }) };
export const Easing = new Proxy({}, { get: () => () => (value: number) => value });
export const InteractionManager = {
    runAfterInteractions: (task?: () => void) => {
        task?.();
        return { cancel: () => undefined };
    },
};
