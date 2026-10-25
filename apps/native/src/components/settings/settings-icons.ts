import Analytics01Icon from "@hugeicons-pro/core-stroke-rounded/Analytics01Icon";
import ArchiveRestoreIcon from "@hugeicons-pro/core-stroke-rounded/ArchiveRestoreIcon";
import BadgeCentIcon from "@hugeicons-pro/core-stroke-rounded/BadgeCentIcon";
import BankIcon from "@hugeicons-pro/core-stroke-rounded/BankIcon";
import BiometricAccessIcon from "@hugeicons-pro/core-stroke-rounded/BiometricAccessIcon";
import Calculator01Icon from "@hugeicons-pro/core-stroke-rounded/Calculator01Icon";
import Calendar01Icon from "@hugeicons-pro/core-stroke-rounded/Calendar01Icon";
import CalendarClockIcon from "@hugeicons-pro/core-stroke-rounded/CalendarClockIcon";
import Camera01Icon from "@hugeicons-pro/core-stroke-rounded/Camera01Icon";
import ChartBarLineIcon from "@hugeicons-pro/core-stroke-rounded/ChartBarLineIcon";
import ChartLineData01Icon from "@hugeicons-pro/core-stroke-rounded/ChartLineData01Icon";
import Clock04Icon from "@hugeicons-pro/core-stroke-rounded/Clock04Icon";
import CloudIcon from "@hugeicons-pro/core-stroke-rounded/CloudIcon";
import CreditCardIcon from "@hugeicons-pro/core-stroke-rounded/CreditCardIcon";
import CurrencyIcon from "@hugeicons-pro/core-stroke-rounded/CurrencyIcon";
import DarkModeIcon from "@hugeicons-pro/core-stroke-rounded/DarkModeIcon";
import DashboardSpeed01Icon from "@hugeicons-pro/core-stroke-rounded/DashboardSpeed01Icon";
import DashboardSquare01Icon from "@hugeicons-pro/core-stroke-rounded/DashboardSquare01Icon";
import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import FavouriteIcon from "@hugeicons-pro/core-stroke-rounded/FavouriteIcon";
import FileExportIcon from "@hugeicons-pro/core-stroke-rounded/FileExportIcon";
import FileImportIcon from "@hugeicons-pro/core-stroke-rounded/FileImportIcon";
import InformationCircleIcon from "@hugeicons-pro/core-stroke-rounded/InformationCircleIcon";
import LanguageSkillIcon from "@hugeicons-pro/core-stroke-rounded/LanguageSkillIcon";
import LayoutTable01Icon from "@hugeicons-pro/core-stroke-rounded/LayoutTable01Icon";
import LegalDocument01Icon from "@hugeicons-pro/core-stroke-rounded/LegalDocument01Icon";
import LicenseIcon from "@hugeicons-pro/core-stroke-rounded/LicenseIcon";
import Logout01Icon from "@hugeicons-pro/core-stroke-rounded/Logout01Icon";
import Mail01Icon from "@hugeicons-pro/core-stroke-rounded/Mail01Icon";
import Mic01Icon from "@hugeicons-pro/core-stroke-rounded/Mic01Icon";
import MoneyAdd01Icon from "@hugeicons-pro/core-stroke-rounded/MoneyAdd01Icon";
import NewTwitterIcon from "@hugeicons-pro/core-stroke-rounded/NewTwitterIcon";
import Notification03Icon from "@hugeicons-pro/core-stroke-rounded/Notification03Icon";
import Plug01Icon from "@hugeicons-pro/core-stroke-rounded/Plug01Icon";
import SecurityCheckIcon from "@hugeicons-pro/core-stroke-rounded/SecurityCheckIcon";
import Share08Icon from "@hugeicons-pro/core-stroke-rounded/Share08Icon";
import SmartPhone01Icon from "@hugeicons-pro/core-stroke-rounded/SmartPhone01Icon";
import SourceCodeIcon from "@hugeicons-pro/core-stroke-rounded/SourceCodeIcon";
import SparklesIcon from "@hugeicons-pro/core-stroke-rounded/SparklesIcon";
import StarIcon from "@hugeicons-pro/core-stroke-rounded/StarIcon";
import SunriseIcon from "@hugeicons-pro/core-stroke-rounded/SunriseIcon";
import SwatchIcon from "@hugeicons-pro/core-stroke-rounded/SwatchIcon";
import Tap01Icon from "@hugeicons-pro/core-stroke-rounded/Tap01Icon";
import TestTubeIcon from "@hugeicons-pro/core-stroke-rounded/TestTubeIcon";
import TextFontIcon from "@hugeicons-pro/core-stroke-rounded/TextFontIcon";
import UserCircleIcon from "@hugeicons-pro/core-stroke-rounded/UserCircleIcon";
import UserRemove01Icon from "@hugeicons-pro/core-stroke-rounded/UserRemove01Icon";
import Wallet01Icon from "@hugeicons-pro/core-stroke-rounded/Wallet01Icon";
import type { IconSvgElement } from "@hugeicons/react-native";

const REGISTRY = {
    Analytics01: Analytics01Icon,
    ArchiveRestore: ArchiveRestoreIcon,
    BadgeCent: BadgeCentIcon,
    Bank: BankIcon,
    BiometricAccess: BiometricAccessIcon,
    Calculator01: Calculator01Icon,
    Calendar01: Calendar01Icon,
    CalendarClock: CalendarClockIcon,
    Camera01: Camera01Icon,
    ChartBarLine: ChartBarLineIcon,
    ChartLineData01: ChartLineData01Icon,
    Clock04: Clock04Icon,
    Cloud: CloudIcon,
    CreditCard: CreditCardIcon,
    Currency: CurrencyIcon,
    DarkMode: DarkModeIcon,
    DashboardSpeed01: DashboardSpeed01Icon,
    DashboardSquare01: DashboardSquare01Icon,
    Delete02: Delete02Icon,
    Favourite: FavouriteIcon,
    FileExport: FileExportIcon,
    FileImport: FileImportIcon,
    InformationCircle: InformationCircleIcon,
    LanguageSkill: LanguageSkillIcon,
    LayoutTable01: LayoutTable01Icon,
    LegalDocument01: LegalDocument01Icon,
    License: LicenseIcon,
    Logout01: Logout01Icon,
    Mail01: Mail01Icon,
    Mic01: Mic01Icon,
    MoneyAdd01: MoneyAdd01Icon,
    NewTwitter: NewTwitterIcon,
    Notification03: Notification03Icon,
    Plug01: Plug01Icon,
    SecurityCheck: SecurityCheckIcon,
    Share08: Share08Icon,
    SmartPhone01: SmartPhone01Icon,
    SourceCode: SourceCodeIcon,
    Sparkles: SparklesIcon,
    Star: StarIcon,
    Sunrise: SunriseIcon,
    Swatch: SwatchIcon,
    Tap01: Tap01Icon,
    TestTube: TestTubeIcon,
    TextFont: TextFontIcon,
    UserCircle: UserCircleIcon,
    UserRemove01: UserRemove01Icon,
    Wallet01: Wallet01Icon,
} satisfies Record<string, IconSvgElement>;

export type SettingsIconName = keyof typeof REGISTRY;

export function settingsIcon(name: SettingsIconName): IconSvgElement {
    return REGISTRY[name];
}
