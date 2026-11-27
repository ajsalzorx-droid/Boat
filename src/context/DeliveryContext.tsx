"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_DELIVERY_APPS, type DeliveryApp } from "@/lib/delivery";

// The delivery apps shown in the navbar (Admin -> Delivery Apps), loaded in the root layout
const DeliveryContext = createContext<DeliveryApp[]>(DEFAULT_DELIVERY_APPS);

export function DeliveryProvider({ apps, children }: { apps: DeliveryApp[]; children: ReactNode }) {
  return <DeliveryContext.Provider value={apps}>{children}</DeliveryContext.Provider>;
}

export const useDeliveryApps = () => useContext(DeliveryContext);
