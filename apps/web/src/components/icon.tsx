import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowLeftRightIcon from "@hugeicons/core-free-icons/ArrowLeftRightIcon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import CornerDownLeftIcon from "@hugeicons/core-free-icons/CornerDownLeftIcon";
import Csv01Icon from "@hugeicons/core-free-icons/Csv01Icon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import FingerprintPatternIcon from "@hugeicons/core-free-icons/FingerprintPatternIcon";
import FlashIcon from "@hugeicons/core-free-icons/FlashIcon";
import GithubIcon from "@hugeicons/core-free-icons/GithubIcon";
import Home03Icon from "@hugeicons/core-free-icons/Home03Icon";
import Invoice01Icon from "@hugeicons/core-free-icons/Invoice01Icon";
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon";
import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon";
import PauseIcon from "@hugeicons/core-free-icons/PauseIcon";
import PlayIcon from "@hugeicons/core-free-icons/PlayIcon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Share03Icon from "@hugeicons/core-free-icons/Share03Icon";
import ShoppingCart01Icon from "@hugeicons/core-free-icons/ShoppingCart01Icon";
import SmartPhone01Icon from "@hugeicons/core-free-icons/SmartPhone01Icon";
import TextFontIcon from "@hugeicons/core-free-icons/TextFontIcon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import UnavailableIcon from "@hugeicons/core-free-icons/UnavailableIcon";
import WifiOff01Icon from "@hugeicons/core-free-icons/WifiOff01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { HugeiconsIconProps } from "@hugeicons/react";

const ICONS = {
    "arrow-elbow-down-left": CornerDownLeftIcon,
    "arrow-left": ArrowLeft02Icon,
    "arrow-right": ArrowRight02Icon,
    "arrow-up-right": ArrowUpRight01Icon,
    "arrows-left-right": ArrowLeftRightIcon,
    "caret-right": ArrowRight01Icon,
    check: Tick02Icon,
    "check-circle": CheckmarkCircle02Icon,
    copy: Copy01Icon,
    "device-mobile": SmartPhone01Icon,
    "download-simple": Download01Icon,
    "envelope-simple": Mail01Icon,
    export: Share03Icon,
    "file-csv": Csv01Icon,
    fingerprint: FingerprintPatternIcon,
    "github-logo": GithubIcon,
    house: Home03Icon,
    lightning: FlashIcon,
    "magnifying-glass": Search01Icon,
    microphone: Mic01Icon,
    pause: PauseIcon,
    play: PlayIcon,
    plus: PlusSignIcon,
    prohibit: UnavailableIcon,
    receipt: Invoice01Icon,
    "shopping-cart": ShoppingCart01Icon,
    "text-aa": TextFontIcon,
    "wifi-slash": WifiOff01Icon,
    x: Cancel01Icon,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: { name: IconName } & Omit<HugeiconsIconProps, "icon">) {
    return <HugeiconsIcon aria-hidden="true" icon={ICONS[name]} size="1em" {...props} />;
}
