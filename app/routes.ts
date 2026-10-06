import { productVersion } from '../src/domain/product-version.ts';
import type { ProductVersion } from '../src/domain/product-version.ts';

export const mainRoutes = ['notebooks', 'buddy', 'study', 'progress', 'settings'] as const;
export type MainRoute = typeof mainRoutes[number];
export type Route = MainRoute | 'diagnostics';
export function defaultRoute(version: ProductVersion = productVersion): MainRoute { return version === 'v1' ? 'buddy' : 'notebooks'; }
export function routeEnabled(route: Route, version: ProductVersion = productVersion) { return version === 'v2' || route === 'buddy' || route === 'settings'; }
export function resolveRoute(route: Route, version: ProductVersion = productVersion): Route { return routeEnabled(route, version) ? route : defaultRoute(version); }
export function visibleTabs(version: ProductVersion = productVersion) { return mainRoutes.filter(route => route !== 'study' && routeEnabled(route, version)); }
export const routeLabels: Record<MainRoute, string> = {
  notebooks: 'Notebooks', buddy: 'AI Buddy', study: 'Study', progress: 'Progress', settings: 'Settings',
};
