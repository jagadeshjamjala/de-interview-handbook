// Code blocks and tables that scroll sideways (wide diagrams/tables on phones) must be reachable by keyboard
// (axe: scrollable-region-focusable). Runs after every route change, including the first load.
export function onRouteDidUpdate(): void {
  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>('pre, table').forEach((el) => {
      if (el.scrollWidth > el.clientWidth && !el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }
    });
  });
}
