export const mainRoutes = ['notebooks', 'study', 'progress', 'settings'] as const;
export type MainRoute = typeof mainRoutes[number];
export type Route = MainRoute | 'diagnostics';
export const routeLabels: Record<MainRoute, string> = {
  notebooks: 'Notebooks', study: 'Study', progress: 'Progress', settings: 'Settings',
};
