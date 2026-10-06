import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { featuresFor, productVersion } from '../src/domain/product-version.ts';
import { defaultRoute, resolveRoute, routeEnabled, visibleTabs } from '../app/routes.ts';

test('V1 demo exposes Buddy/Settings and rejects every retained study entry route', () => {
  assert.ok(['v1', 'v2'].includes(productVersion));
  assert.deepEqual(visibleTabs('v1'), ['buddy', 'settings']);
  assert.equal(defaultRoute('v1'), 'buddy');
  for (const route of ['notebooks', 'study', 'progress', 'diagnostics']) {
    assert.equal(routeEnabled(route, 'v1'), false);
    assert.equal(resolveRoute(route, 'v1'), 'buddy');
  }
  assert.equal(resolveRoute('settings', 'v1'), 'settings');
  assert.deepEqual(featuresFor('v1'), { fullStudy: false, buddy: true, settings: true, splash: true });
});

test('V2 restores existing routes and supporting feature gates without changing data', () => {
  assert.deepEqual(visibleTabs('v2'), ['notebooks', 'buddy', 'progress', 'settings']);
  assert.equal(defaultRoute('v2'), 'notebooks');
  for (const route of ['notebooks', 'study', 'progress', 'diagnostics', 'buddy', 'settings']) {
    assert.equal(resolveRoute(route, 'v2'), route);
  }
  assert.equal(featuresFor('v2').fullStudy, true);
});

test('retained secondary UI entry points use the same gate', () => {
  const buddy = readFileSync(new URL('../src/features/buddy/BuddyScreen.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../src/features/settings/SettingsScreen.tsx', import.meta.url), 'utf8');
  const shell = readFileSync(new URL('../app/AppShell.tsx', import.meta.url), 'utf8');
  assert.match(buddy, /productFeatures\.fullStudy \? \[/);
  assert.match(settings, /productFeatures\.fullStudy && page === 'storage'/);
  assert.match(settings, /productFeatures\.fullStudy && <Action title="T0 diagnostics/);
  assert.match(shell, /const route = resolveRoute\(requestedRoute\)/);
  assert.match(shell, /setRoute\(defaultRoute\(\)\)/);
});
