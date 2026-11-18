import Airplane01 from "@hugeicons-pro/core-solid-rounded/Airplane01Icon";
import Bank from "@hugeicons-pro/core-solid-rounded/BankIcon";
import Bus01 from "@hugeicons-pro/core-solid-rounded/Bus01Icon";
import CreditCard from "@hugeicons-pro/core-solid-rounded/CreditCardIcon";
import FilmRoll01 from "@hugeicons-pro/core-solid-rounded/FilmRoll01Icon";
import Flash from "@hugeicons-pro/core-solid-rounded/FlashIcon";
import Fuel01 from "@hugeicons-pro/core-solid-rounded/Fuel01Icon";
import Home01 from "@hugeicons-pro/core-solid-rounded/Home01Icon";
import Laptop from "@hugeicons-pro/core-solid-rounded/LaptopIcon";
import MoneyBag01 from "@hugeicons-pro/core-solid-rounded/MoneyBag01Icon";
import MoreHorizontalCircle01 from "@hugeicons-pro/core-solid-rounded/MoreHorizontalCircle01Icon";
import PiggyBank from "@hugeicons-pro/core-solid-rounded/PiggyBankIcon";
import Repeat from "@hugeicons-pro/core-solid-rounded/RepeatIcon";
import Restaurant01 from "@hugeicons-pro/core-solid-rounded/Restaurant01Icon";
import ShoppingBag01 from "@hugeicons-pro/core-solid-rounded/ShoppingBag01Icon";
import ShoppingCart01 from "@hugeicons-pro/core-solid-rounded/ShoppingCart01Icon";
import Wallet01 from "@hugeicons-pro/core-solid-rounded/Wallet01Icon";
import Wifi01 from "@hugeicons-pro/core-solid-rounded/Wifi01Icon";
import type { IconSvgElement } from "@hugeicons/react";

const SOLID = new Map<string, IconSvgElement>([
    ["Airplane01", Airplane01],
    ["Bank", Bank],
    ["Bus01", Bus01],
    ["CreditCard", CreditCard],
    ["FilmRoll01", FilmRoll01],
    ["Flash", Flash],
    ["Fuel01", Fuel01],
    ["Home01", Home01],
    ["Laptop", Laptop],
    ["MoneyBag01", MoneyBag01],
    ["PiggyBank", PiggyBank],
    ["Repeat", Repeat],
    ["Restaurant01", Restaurant01],
    ["ShoppingBag01", ShoppingBag01],
    ["ShoppingCart01", ShoppingCart01],
    ["Wallet01", Wallet01],
    ["Wifi01", Wifi01],
]);

export const solidCategoryIcon = (name: string | null): IconSvgElement =>
    (name ? SOLID.get(name) : undefined) ?? MoreHorizontalCircle01;
