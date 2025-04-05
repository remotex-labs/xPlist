/**
 * This module provides exports from legacy XML and binary modules.
 * It exists only for backward compatibility with older code.
 *
 * @deprecated Please import directly from './xml' or './binary' modules instead to avoid loading unnecessary code.
 * Direct imports allow tree-shaking to work
 * properly and reduce bundle size by including only the code you actually use.
 * This file will be removed in a future version.
 */

export * from './xml';
export * from './binary';
