export function setBorderPx(px: 0|1|2|3) {
  document.body.style.outline = px ? `${px}px solid rgba(110,110,130,.5)` : "none";
}
export function setControlsCollapsed(collapsed: boolean) {
  const c = document.getElementById("controls")! as HTMLDivElement;
  c.style.height = collapsed ? "0px" : "42px";
  c.style.padding = collapsed ? "0 8px" : "6px 8px";
  c.style.borderBottomWidth = collapsed ? "0px" : "1px";
  c.style.overflow = "hidden";
}
